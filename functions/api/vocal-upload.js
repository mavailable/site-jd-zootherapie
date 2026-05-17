// POST /api/vocal-upload — Réception d'un vocal client depuis /admin
//
// Flux :
//   1. Auth : cookie HttpOnly cms_session (requireAuth) — pareil que le reste du CMS
//   2. Body multipart/form-data : audio (Blob) + sujet (string)
//   3. Push fichier dans R2 binding VOCAUX, key = <slug>/<YYYY-MM-DD-HHmm>-<sujet-slugifie>.<ext>
//   4. Append entrée dans src/content/vocaux/index.json (commit GitHub via API REST)
//   5. POST vers warming-worker /notify-marc avec lien signé HMAC
//   6. Réponse { ok, id, vocal_url, mail_sent }
//
// Env vars CF Pages requis :
//   - CMS_SESSION_SECRET     (déjà en place pour /admin auth)
//   - CMS_REPO               (déjà en place, ex: mavailable/site-jd-zootherapie)
//   - CMS_BRANCH             (déjà en place, master)
//   - GITHUB_TOKEN           (déjà en place pour commits)
//   - SITE_SLUG              (nouveau, ex: jd-zoo — identifie le site dans le mail)
//   - CLIENT_NAME            (nouveau, ex: "Jennifer De Groeve")
//   - VOCAUX_SIGNING_KEY     (nouveau, HMAC pour signer les URL de download)
//   - NOTIFY_WORKER_URL      (nouveau, https://warming-api.marc-f10.workers.dev/notify-marc)
//   - NOTIFY_TOKEN           (nouveau, partagé avec warming-worker)
//
// Bindings CF Pages requis :
//   - VOCAUX (R2 bucket: vocaux-clients)

import { requireAuth, jsonHeaders } from './cms/_auth-helpers.js';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB — un vocal 30 min ≈ 15 MB max en webm
const ALLOWED_MIME_PREFIX = ['audio/', 'video/webm']; // MediaRecorder peut taguer en video/webm

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
  // Format YYYY-MM-DD-HHmm en heure de Paris
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

export async function onRequestPost({ request, env }) {
  // Auth
  try {
    await requireAuth(request, env);
  } catch (authError) {
    return authError;
  }

  // Vérif bindings et env
  if (!env.VOCAUX) {
    return new Response(JSON.stringify({ error: 'R2 binding VOCAUX missing — vérifier la config CF Pages' }), { status: 500, headers: jsonHeaders() });
  }
  if (!env.VOCAUX_SIGNING_KEY || !env.SITE_SLUG || !env.CLIENT_NAME) {
    return new Response(JSON.stringify({ error: 'Env vars VOCAUX_SIGNING_KEY / SITE_SLUG / CLIENT_NAME requises' }), { status: 500, headers: jsonHeaders() });
  }

  // Parse multipart
  let form;
  try {
    form = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Requête multipart invalide' }), { status: 400, headers: jsonHeaders() });
  }

  const audio = form.get('audio');
  const sujet = (form.get('sujet') || '').toString().trim();

  if (!audio || typeof audio === 'string') {
    return new Response(JSON.stringify({ error: 'Champ "audio" manquant ou invalide' }), { status: 400, headers: jsonHeaders() });
  }

  // Validations sécurité
  const mime = audio.type || '';
  if (!ALLOWED_MIME_PREFIX.some((p) => mime.startsWith(p))) {
    return new Response(JSON.stringify({ error: `Type MIME non supporté : ${mime}` }), { status: 400, headers: jsonHeaders() });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return new Response(JSON.stringify({ error: `Audio trop volumineux (${Math.round(audio.size / 1024 / 1024)} MB, max ${MAX_AUDIO_BYTES / 1024 / 1024} MB)` }), { status: 413, headers: jsonHeaders() });
  }
  if (audio.size < 1024) {
    return new Response(JSON.stringify({ error: 'Audio trop petit, enregistrement vide ou corrompu' }), { status: 400, headers: jsonHeaders() });
  }

  // Build clé R2 et ID
  const ts = parisTimestamp();
  const sujetSlug = slugify(sujet) || 'sans-sujet';
  const ext = extFromMime(mime);
  const filename = `${ts}-${sujetSlug}.${ext}`;
  const r2Key = `${env.SITE_SLUG}/${filename}`;
  const id = `${env.SITE_SLUG}-${ts}-${sujetSlug}`;

  // 1. Push R2
  try {
    await env.VOCAUX.put(r2Key, audio.stream(), {
      httpMetadata: { contentType: mime },
      customMetadata: {
        site_slug: env.SITE_SLUG,
        sujet: sujet || '',
        uploaded_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: `Échec upload R2 : ${err.message}` }), { status: 500, headers: jsonHeaders() });
  }

  // Build URL signée pour download (valide 30 jours, suffit pour vocal en attente de traitement)
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
  const signaturePayload = `${r2Key}.${expires}`;
  const sig = await hmacSign(env.VOCAUX_SIGNING_KEY, signaturePayload);
  const origin = new URL(request.url).origin;
  const vocal_url = `${origin}/api/vocal-download?k=${encodeURIComponent(r2Key)}&e=${expires}&s=${sig}`;

  // 2. Append entrée dans src/content/vocaux/index.json (commit GitHub)
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
    // si 404 : le fichier n'existe pas encore, on le crée
  } catch {
    // Fichier inexistant ou JSON corrompu : on repart d'un tableau vide
    entries = [];
  }

  const newEntry = {
    id,
    sujet,
    filename,
    r2_key: r2Key,
    vocal_url,
    audio_mime: mime,
    audio_bytes: audio.size,
    uploaded_at: new Date().toISOString(),
    statut: 'envoye', // envoye → transcrit → publie
  };
  entries.unshift(newEntry); // plus récent en haut
  // Cap à 100 entrées (au-delà, ré-archiver à la main)
  if (entries.length > 100) entries = entries.slice(0, 100);

  const jsonContent = JSON.stringify({ entries }, null, 2) + '\n';
  const encoded = btoa(unescape(encodeURIComponent(jsonContent)));
  const commitPayload = {
    message: `[vocal] ${env.CLIENT_NAME} — ${sujet || 'sans sujet'}`,
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
      // Le R2 est déjà OK, on continue mais on signale le problème de log
      console.error(`[vocal-upload] GitHub commit failed: ${putResp.status} ${errBody}`);
    }
  } catch (err) {
    console.error(`[vocal-upload] GitHub commit threw: ${err.message}`);
  }

  // 3. Notif Marc via warming-worker
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
          vocal_url,
          audio_filename: filename,
        }),
      });
      mail_sent = notifResp.ok;
      if (!notifResp.ok) {
        console.error(`[vocal-upload] notify-marc failed: ${notifResp.status}`);
      }
    } catch (err) {
      console.error(`[vocal-upload] notify-marc threw: ${err.message}`);
    }
  }

  return new Response(
    JSON.stringify({ ok: true, id, vocal_url, mail_sent }),
    { status: 200, headers: jsonHeaders() }
  );
}
