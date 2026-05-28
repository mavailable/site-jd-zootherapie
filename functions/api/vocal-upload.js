// POST /api/vocal-upload — Réception d'un message client (texte, vocaux et/ou médias) depuis /admin
//
// Flux :
//   1. Auth : cookie HttpOnly cms_session (requireAuth)
//   2. Body multipart/form-data :
//        - sujet (string, REQUIS)
//        - categorie (string slug, ex: "idee-article")
//        - categorie_label (string lisible, ex: "Idée d'article de blog")
//        - note (string, OPTIONNEL — message texte libre du client)
//        - audio_count (number)
//        - audio_0, audio_1, ... audio_N (Blobs, 0 à MAX_CLIPS clips audio — OPTIONNEL)
//        - audio (Blob, accepté pour rétrocompat ancien client mono-vocal)
//        - media_count (number)
//        - media_0, media_1, ... media_N (Blobs, 0 à MAX_MEDIA pièces jointes — OPTIONNEL :
//          images, vidéos, PDF). Compteur DISTINCT des vocaux audio.
//      Au moins UN des trois est requis : `note` non vide OU >= 1 audio OU >= 1 média.
//   3. Push chaque fichier (audio + média) dans R2 binding VOCAUX, key = <slug>/<ts>-<sujet>-...<ext>
//      (aucun upload R2 si l'envoi est texte-seul)
//   4. Append 1 entrée dans src/content/vocaux/index.json avec note + attachments[] (audio) +
//      media[] (images/vidéos/pdf) (commit GitHub)
//   5. POST vers warming-worker /notify-marc avec le texte + tous les liens signés + categorie
//   6. Réponse { ok, id, note, attachments: [{ vocal_url }], media: [{ vocal_url }], mail_sent }
//
// Env vars CF Pages requis :
//   - CMS_SESSION_SECRET, CMS_REPO, CMS_BRANCH, GITHUB_TOKEN
//   - SITE_SLUG, CLIENT_NAME, VOCAUX_SIGNING_KEY
//   - NOTIFY_WORKER_URL, NOTIFY_TOKEN
//
// Bindings CF Pages requis :
//   - VOCAUX (R2 bucket: vocaux-clients)
//
// CONTRAINTES Cloudflare Pages Functions (plan Free/Pro) :
//   - Le body de requête est plafonné à 100 MB côté edge CF (rejet 413 AVANT la Function
//     sur Free/Pro ; 200 MB Business, 500 MB Enterprise). Le multipart total (tous fichiers
//     + champs) doit rester sous cette limite. On plafonne le payload total à 85 MB côté front
//     ET on revalide par fichier côté serveur (le front peut être contourné).
//   - L'upload transite par la Function (request.formData() → R2.put(file.stream())). Le stream
//     vers R2 évite de bufferiser le fichier entier en mémoire, mais le body global reste borné
//     par la limite edge. Les VIDÉOS sont le risque : on les plafonne bas (40 MB) pour rester
//     fiable via la Function actuelle SANS upload presigned R2 direct. Au-delà → message i18n
//     invitant le client à compresser ou à envoyer la vidéo autrement (WhatsApp).

import { requireAuth, jsonHeaders } from './cms/_auth-helpers.js';

const MAX_AUDIO_BYTES_PER_FILE = 25 * 1024 * 1024; // 25 MB par clip audio
const MAX_CLIPS = 15;
const MAX_NOTE_CHARS = 5000; // garde-fou taille du message texte

// --- Médias (images / vidéos / PDF) — compteur DISTINCT des vocaux audio ---
const MAX_MEDIA = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB par image
const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB par vidéo (plafond fiable via la Function, sans presigned)
const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB par PDF/document
const MAX_TOTAL_PAYLOAD_BYTES = 85 * 1024 * 1024; // marge sous la limite edge CF 100 MB (champs + overhead multipart)

// Types médias autorisés. Clé = MIME exact, valeur = { kind, ext, max }.
// Les images couvrent jpg/jpeg/png/webp/gif + heic/heif (smartphones Apple).
const ALLOWED_MEDIA = {
  'image/jpeg': { kind: 'image', ext: 'jpg', max: MAX_IMAGE_BYTES },
  'image/png': { kind: 'image', ext: 'png', max: MAX_IMAGE_BYTES },
  'image/webp': { kind: 'image', ext: 'webp', max: MAX_IMAGE_BYTES },
  'image/gif': { kind: 'image', ext: 'gif', max: MAX_IMAGE_BYTES },
  'image/heic': { kind: 'image', ext: 'heic', max: MAX_IMAGE_BYTES },
  'image/heif': { kind: 'image', ext: 'heif', max: MAX_IMAGE_BYTES },
  'video/mp4': { kind: 'video', ext: 'mp4', max: MAX_VIDEO_BYTES },
  'video/quicktime': { kind: 'video', ext: 'mov', max: MAX_VIDEO_BYTES },
  'video/webm': { kind: 'video', ext: 'webm', max: MAX_VIDEO_BYTES },
  'application/pdf': { kind: 'pdf', ext: 'pdf', max: MAX_DOC_BYTES },
};
// Extensions autorisées (fallback quand le MIME est vide/générique, ex: application/octet-stream
// sur certains navigateurs mobiles). On valide MIME OU extension, jamais l'un sans l'autre confiance.
const EXT_TO_MEDIA = {
  jpg: { mime: 'image/jpeg', kind: 'image', max: MAX_IMAGE_BYTES },
  jpeg: { mime: 'image/jpeg', kind: 'image', max: MAX_IMAGE_BYTES },
  png: { mime: 'image/png', kind: 'image', max: MAX_IMAGE_BYTES },
  webp: { mime: 'image/webp', kind: 'image', max: MAX_IMAGE_BYTES },
  gif: { mime: 'image/gif', kind: 'image', max: MAX_IMAGE_BYTES },
  heic: { mime: 'image/heic', kind: 'image', max: MAX_IMAGE_BYTES },
  heif: { mime: 'image/heif', kind: 'image', max: MAX_IMAGE_BYTES },
  mp4: { mime: 'video/mp4', kind: 'video', max: MAX_VIDEO_BYTES },
  mov: { mime: 'video/quicktime', kind: 'video', max: MAX_VIDEO_BYTES },
  webm: { mime: 'video/webm', kind: 'video', max: MAX_VIDEO_BYTES },
  pdf: { mime: 'application/pdf', kind: 'pdf', max: MAX_DOC_BYTES },
};

const ALLOWED_MIME_PREFIX = ['audio/', 'video/webm'];
const ALLOWED_CATEGORIES = new Set([
  'idee-article',
  'concept',
  'post-facebook',
  'post-linkedin',
  'landing-page',
  'question',
  'feedback',
  'autre',
]);

function slugify(s) {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function extFromMime(mime) {
  if (!mime) return 'webm';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('ogg') || mime.includes('opus')) return 'opus';
  if (mime.includes('wav')) return 'wav';
  return 'webm';
}

function extOf(name) {
  if (!name || typeof name !== 'string') return '';
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

// Résout (kind, ext, max, mime) pour un fichier média.
// Stratégie : MIME exact d'abord, sinon extension du nom de fichier (certains navigateurs
// mobiles envoient application/octet-stream). Renvoie null si ni l'un ni l'autre n'est autorisé.
function resolveMedia(file) {
  const mime = (file.type || '').toLowerCase().split(';')[0].trim();
  if (mime && ALLOWED_MEDIA[mime]) {
    const m = ALLOWED_MEDIA[mime];
    return { kind: m.kind, ext: m.ext, max: m.max, mime };
  }
  const ext = extOf(file.name);
  if (ext && EXT_TO_MEDIA[ext]) {
    const m = EXT_TO_MEDIA[ext];
    return { kind: m.kind, ext: ext === 'jpeg' ? 'jpg' : ext, max: m.max, mime: m.mime };
  }
  return null;
}

function parisTimestamp() {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}`;
}

async function hmacSign(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function err(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: jsonHeaders() });
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (authError) {
    return authError;
  }

  if (!env.VOCAUX) return err('R2 binding VOCAUX missing — vérifier la config CF Pages', 500);
  if (!env.VOCAUX_SIGNING_KEY || !env.SITE_SLUG || !env.CLIENT_NAME) {
    return err('Env vars VOCAUX_SIGNING_KEY / SITE_SLUG / CLIENT_NAME requises', 500);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return err('Requête multipart invalide');
  }

  const sujet = (form.get('sujet') || '').toString().trim();
  if (!sujet) return err('Le sujet est obligatoire');

  let categorie = (form.get('categorie') || '').toString().trim();
  if (categorie && !ALLOWED_CATEGORIES.has(categorie)) {
    categorie = 'autre';
  }
  if (!categorie) categorie = 'autre';
  const categorie_label = (form.get('categorie_label') || '').toString().trim() || categorie;

  // Message texte libre (optionnel)
  let note = (form.get('note') || '').toString().trim();
  if (note.length > MAX_NOTE_CHARS) {
    note = note.slice(0, MAX_NOTE_CHARS);
  }

  // Collect audio files : audio_0..audio_N, ou audio (legacy mono)
  const audioFiles = [];
  for (let i = 0; i < MAX_CLIPS; i++) {
    const f = form.get(`audio_${i}`);
    if (f && typeof f !== 'string') audioFiles.push(f);
  }
  if (audioFiles.length === 0) {
    const legacy = form.get('audio');
    if (legacy && typeof legacy !== 'string') audioFiles.push(legacy);
  }

  // Collect media files : media_0..media_N (images / vidéos / PDF). Compteur DISTINCT des vocaux.
  const mediaFiles = [];
  for (let i = 0; i < MAX_MEDIA; i++) {
    const f = form.get(`media_${i}`);
    if (f && typeof f !== 'string') mediaFiles.push(f);
  }

  // Au moins l'un des trois : message texte OU >= 1 audio OU >= 1 média.
  if (audioFiles.length === 0 && mediaFiles.length === 0 && !note) {
    return err('Écris un message, enregistre un vocal ou joins un média');
  }
  if (audioFiles.length > MAX_CLIPS) return err(`Maximum ${MAX_CLIPS} vocaux par envoi`);
  if (mediaFiles.length > MAX_MEDIA) return err(`Maximum ${MAX_MEDIA} médias par envoi`);

  // Validation audio par fichier
  for (const audio of audioFiles) {
    const mime = audio.type || '';
    if (!ALLOWED_MIME_PREFIX.some((p) => mime.startsWith(p))) {
      return err(`Type MIME non supporté : ${mime}`);
    }
    if (audio.size > MAX_AUDIO_BYTES_PER_FILE) {
      return err(`Audio trop volumineux (${Math.round(audio.size / 1024 / 1024)} MB, max ${MAX_AUDIO_BYTES_PER_FILE / 1024 / 1024} MB)`, 413);
    }
    if (audio.size < 1024) {
      return err('Audio trop petit, enregistrement vide ou corrompu');
    }
  }

  // Validation média par fichier (MIME + extension, jamais front-only) + résolution kind/ext
  const resolvedMedia = [];
  for (const media of mediaFiles) {
    const r = resolveMedia(media);
    if (!r) {
      const label = media.type || extOf(media.name) || 'inconnu';
      return err(`Type de fichier non supporté : ${label}. Formats acceptés : images (jpg, png, webp, gif, heic), vidéos (mp4, mov, webm), PDF.`);
    }
    if (media.size > r.max) {
      const cap = Math.round(r.max / 1024 / 1024);
      const kindLabel = r.kind === 'video' ? 'Vidéo' : r.kind === 'pdf' ? 'PDF' : 'Image';
      return err(`${kindLabel} trop volumineux(se) (${Math.round(media.size / 1024 / 1024)} MB, max ${cap} MB).`, 413);
    }
    if (media.size < 1) {
      return err('Média vide ou corrompu.');
    }
    resolvedMedia.push({ file: media, ...r });
  }

  // Garde-fou payload TOTAL : tous fichiers (audio + média) cumulés sous la limite edge CF 100 MB.
  // CF rejette le body > 100 MB par un 413 edge AVANT cette Function ; on contrôle ici pour un
  // message propre tant qu'on a encore la main (au cas où l'edge laisse passer un poil sous 100).
  const totalBytes =
    audioFiles.reduce((s, f) => s + (f.size || 0), 0) +
    mediaFiles.reduce((s, f) => s + (f.size || 0), 0);
  if (totalBytes > MAX_TOTAL_PAYLOAD_BYTES) {
    return err(
      `Envoi trop lourd (${Math.round(totalBytes / 1024 / 1024)} MB au total, max ${MAX_TOTAL_PAYLOAD_BYTES / 1024 / 1024} MB). Retire ou compresse des fichiers.`,
      413
    );
  }

  // Construit clés R2 + URLs signées
  const ts = parisTimestamp();
  const sujetSlug = slugify(sujet) || 'sans-sujet';
  const id = `${env.SITE_SLUG}-${ts}-${sujetSlug}`;
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30j
  const origin = new URL(request.url).origin;

  const attachments = [];
  for (let i = 0; i < audioFiles.length; i++) {
    const audio = audioFiles[i];
    const mime = audio.type || '';
    const ext = extFromMime(mime);
    const suffix = audioFiles.length > 1 ? `-${i + 1}` : '';
    const filename = `${ts}-${sujetSlug}${suffix}.${ext}`;
    const r2Key = `${env.SITE_SLUG}/${filename}`;

    try {
      await env.VOCAUX.put(r2Key, audio.stream(), {
        httpMetadata: { contentType: mime },
        customMetadata: {
          site_slug: env.SITE_SLUG,
          sujet,
          categorie,
          index: String(i),
          uploaded_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      return err(`Échec upload R2 (fichier ${i + 1}/${audioFiles.length}) : ${e.message}`, 500);
    }

    const signaturePayload = `${r2Key}.${expires}`;
    const sig = await hmacSign(env.VOCAUX_SIGNING_KEY, signaturePayload);
    const vocal_url = `${origin}/api/vocal-download?k=${encodeURIComponent(r2Key)}&e=${expires}&s=${sig}`;

    attachments.push({
      filename,
      r2_key: r2Key,
      vocal_url,
      audio_mime: mime,
      audio_bytes: audio.size,
    });
  }

  // Upload des médias (images / vidéos / PDF) dans R2 + URLs signées.
  // Tableau `media` SÉPARÉ de `attachments` (audio) : rétrocompat totale (entrées audio-only
  // n'ont pas de `media`) et le flux résolution (_entry_kind) distingue audio/média/texte.
  const media = [];
  for (let i = 0; i < resolvedMedia.length; i++) {
    const { file, kind, ext, mime } = resolvedMedia[i];
    const suffix = resolvedMedia.length > 1 ? `-m${i + 1}` : '-media';
    const filename = `${ts}-${sujetSlug}${suffix}.${ext}`;
    const r2Key = `${env.SITE_SLUG}/${filename}`;

    try {
      await env.VOCAUX.put(r2Key, file.stream(), {
        httpMetadata: { contentType: mime },
        customMetadata: {
          site_slug: env.SITE_SLUG,
          sujet,
          categorie,
          kind,
          index: String(i),
          uploaded_at: new Date().toISOString(),
        },
      });
    } catch (e) {
      return err(`Échec upload R2 (média ${i + 1}/${resolvedMedia.length}) : ${e.message}`, 500);
    }

    const signaturePayload = `${r2Key}.${expires}`;
    const sig = await hmacSign(env.VOCAUX_SIGNING_KEY, signaturePayload);
    const vocal_url = `${origin}/api/vocal-download?k=${encodeURIComponent(r2Key)}&e=${expires}&s=${sig}`;

    media.push({
      filename,
      r2_key: r2Key,
      vocal_url,
      kind, // image | video | pdf
      media_mime: mime,
      media_bytes: file.size,
    });
  }

  // Append entrée dans src/content/vocaux/index.json
  const ghHeaders = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'WebFactory-Vocaux',
  };
  const vocauxPath = 'src/content/vocaux/index.json';
  let existingSha = null;
  let entries = [];

  try {
    const getResp = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${vocauxPath}?ref=${env.CMS_BRANCH || 'master'}`,
      { headers: ghHeaders }
    );
    if (getResp.ok) {
      const data = await getResp.json();
      existingSha = data.sha;
      const decoded = atob(data.content.replace(/\n/g, ''));
      const parsed = JSON.parse(decoded);
      entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    }
  } catch {
    entries = [];
  }

  const newEntry = {
    id,
    sujet,
    categorie,
    categorie_label,
    note: note || undefined,
    attachments,
    media: media.length > 0 ? media : undefined,
    uploaded_at: new Date().toISOString(),
    statut: 'envoye',
  };
  entries.unshift(newEntry);
  if (entries.length > 100) entries = entries.slice(0, 100);

  const jsonContent = JSON.stringify({ entries }, null, 2) + '\n';
  const encoded = btoa(unescape(encodeURIComponent(jsonContent)));
  // Tag du commit message décrivant le contenu : vocaux ×N et/ou médias ×N, sinon texte.
  const tagParts = [];
  if (audioFiles.length > 0) tagParts.push(`${audioFiles.length} vocal${audioFiles.length > 1 ? 'aux' : ''}`);
  if (media.length > 0) tagParts.push(`${media.length} média${media.length > 1 ? 's' : ''}`);
  if (tagParts.length === 0) tagParts.push('texte');
  const kindTag = ` (${tagParts.join(' + ')})`;
  const commitPayload = {
    message: `[message] ${env.CLIENT_NAME} — [${categorie_label}] ${sujet}${kindTag}`,
    content: encoded,
    branch: env.CMS_BRANCH || 'master',
  };
  if (existingSha) commitPayload.sha = existingSha;

  try {
    const putResp = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${vocauxPath}`,
      { method: 'PUT', headers: ghHeaders, body: JSON.stringify(commitPayload) }
    );
    if (!putResp.ok) {
      const errBody = await putResp.text();
      console.error(`[vocal-upload] GitHub commit failed: ${putResp.status} ${errBody}`);
    }
  } catch (e) {
    console.error(`[vocal-upload] GitHub commit threw: ${e.message}`);
  }

  // Notif Marc via warming-worker
  let mail_sent = false;
  if (env.NOTIFY_WORKER_URL && env.NOTIFY_TOKEN) {
    try {
      const notifResp = await fetch(env.NOTIFY_WORKER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.NOTIFY_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          site_slug: env.SITE_SLUG,
          client_name: env.CLIENT_NAME,
          sujet,
          categorie,
          categorie_label,
          note: note || undefined,
          attachments: attachments.map((a) => ({
            filename: a.filename,
            vocal_url: a.vocal_url,
            audio_bytes: a.audio_bytes,
          })),
          media: media.map((m) => ({
            filename: m.filename,
            vocal_url: m.vocal_url,
            kind: m.kind,
            media_bytes: m.media_bytes,
          })),
          // Rétrocompat : pour anciens workers qui ne savent lire que vocal_url/audio_filename
          vocal_url: attachments.length > 0 ? attachments[0].vocal_url : undefined,
          audio_filename: attachments.length > 0 ? attachments[0].filename : undefined,
        }),
      });
      mail_sent = notifResp.ok;
      if (!notifResp.ok) {
        console.error(`[vocal-upload] notify-marc failed: ${notifResp.status}`);
      }
    } catch (e) {
      console.error(`[vocal-upload] notify-marc threw: ${e.message}`);
    }
  }

  // Strip r2_key avant retour côté client
  const safeAttachments = attachments.map(({ r2_key, ...rest }) => rest);
  const safeMedia = media.map(({ r2_key, ...rest }) => rest);

  return new Response(
    JSON.stringify({
      ok: true,
      id,
      note: note || undefined,
      attachments: safeAttachments,
      media: safeMedia,
      mail_sent,
    }),
    { status: 200, headers: jsonHeaders() }
  );
}
