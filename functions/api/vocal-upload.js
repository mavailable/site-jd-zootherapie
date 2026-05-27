// POST /api/vocal-upload — Réception d'un (ou plusieurs) vocal client depuis /admin
//
// Flux :
//   1. Auth : cookie HttpOnly cms_session (requireAuth)
//   2. Body multipart/form-data :
//        - sujet (string, REQUIS)
//        - categorie (string slug, ex: "idee-article")
//        - categorie_label (string lisible, ex: "Idée d'article de blog")
//        - audio_count (number)
//        - audio_0, audio_1, ... audio_N (Blobs, 1 à MAX_CLIPS fichiers)
//        - audio (Blob, accepté pour rétrocompat ancien client mono-vocal)
//   3. Push chaque fichier dans R2 binding VOCAUX, key = <slug>/<ts>-<sujet>-<i>.<ext>
//   4. Append 1 entrée dans src/content/vocaux/index.json avec attachments[] (commit GitHub)
//   5. POST vers warming-worker /notify-marc avec tous les liens signés + categorie
//   6. Réponse { ok, id, attachments: [{ vocal_url }], mail_sent }
//
// Env vars CF Pages requis :
//   - CMS_SESSION_SECRET, CMS_REPO, CMS_BRANCH, GITHUB_TOKEN
//   - SITE_SLUG, CLIENT_NAME, VOCAUX_SIGNING_KEY
//   - NOTIFY_WORKER_URL, NOTIFY_TOKEN
//
// Bindings CF Pages requis :
//   - VOCAUX (R2 bucket: vocaux-clients)

import { requireAuth, jsonHeaders } from './cms/_auth-helpers.js';

const MAX_AUDIO_BYTES_PER_FILE = 25 * 1024 * 1024; // 25 MB par fichier
const MAX_CLIPS = 15;
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
  if (audioFiles.length === 0) return err('Aucun fichier audio fourni');
  if (audioFiles.length > MAX_CLIPS) return err(`Maximum ${MAX_CLIPS} fichiers par envoi`);

  // Validation par fichier
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
    attachments,
    uploaded_at: new Date().toISOString(),
    statut: 'envoye',
  };
  entries.unshift(newEntry);
  if (entries.length > 100) entries = entries.slice(0, 100);

  const jsonContent = JSON.stringify({ entries }, null, 2) + '\n';
  const encoded = btoa(unescape(encodeURIComponent(jsonContent)));
  const commitPayload = {
    message: `[vocal] ${env.CLIENT_NAME} — [${categorie_label}] ${sujet}${audioFiles.length > 1 ? ` (×${audioFiles.length})` : ''}`,
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
          attachments: attachments.map((a) => ({
            filename: a.filename,
            vocal_url: a.vocal_url,
            audio_bytes: a.audio_bytes,
          })),
          // Rétrocompat : pour anciens workers qui ne savent lire que vocal_url/audio_filename
          vocal_url: attachments[0].vocal_url,
          audio_filename: attachments[0].filename,
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

  return new Response(
    JSON.stringify({ ok: true, id, attachments: safeAttachments, mail_sent }),
    { status: 200, headers: jsonHeaders() }
  );
}
