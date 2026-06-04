// POST /api/cms/migrate-images — Migration one-shot des images de contenu
// public/images/* -> bucket R2 CMS_IMAGES (cle <SITE_SLUG>/<chemin>).
//
// TEMPORAIRE : utilise au chantier "images CMS via R2" (pilote galgoessolo) pour
// copier les images deja livrees (servies comme assets de build sous /images/...)
// vers R2, AVANT de les retirer de public/images/ et de reecrire les refs JSON.
// A SUPPRIMER une fois la migration validee.
//
// Pourquoi un endpoint serveur : le token CF local n'a pas la permission R2 write,
// mais le binding CMS_IMAGES (provisionne par l'infra) l'a. La Function fetch
// chaque asset depuis sa propre origine (/images/<f>, encore present dans le build)
// puis le put dans R2. Idempotent : skip si la cle existe deja (sauf ?force=1).
//
// Auth : session admin CMS requise. Bindings : CMS_IMAGES. Env : SITE_SLUG.
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

function guessContentType(name) {
  const ext = name.split('.').pop()?.toLowerCase();
  return {
    webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', svg: 'image/svg+xml', gif: 'image/gif', avif: 'image/avif',
  }[ext] || 'application/octet-stream';
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) {
    return new Response(JSON.stringify({ error: 'Origine non autorisée' }), { status: 403, headers: jsonHeaders() });
  }
  if (!env.CMS_IMAGES || !env.SITE_SLUG) {
    return new Response(JSON.stringify({ error: 'Stockage images non configuré' }), { status: 500, headers: jsonHeaders() });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Corps invalide' }), { status: 400, headers: jsonHeaders() });
  }

  const files = Array.isArray(body.files) ? body.files : [];
  const force = !!body.force;
  if (files.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucun fichier' }), { status: 400, headers: jsonHeaders() });
  }

  const origin = new URL(request.url).origin;
  const prefix = `${env.SITE_SLUG}/`;
  const results = { migrated: [], skipped: [], failed: [] };

  for (const rel of files) {
    // rel = chemin relatif sous /images/, ex "blog/foo/02-image.webp"
    const clean = String(rel).replace(/^\/+images\/+/, '').replace(/^\/+/, '');
    if (!clean || clean.includes('..')) { results.failed.push({ rel, reason: 'invalid path' }); continue; }
    const key = `${prefix}${clean}`;

    try {
      if (!force) {
        const head = await env.CMS_IMAGES.head(key);
        if (head) { results.skipped.push(clean); continue; }
      }
      const res = await fetch(`${origin}/images/${clean}`);
      if (!res.ok) { results.failed.push({ rel: clean, reason: `fetch ${res.status}` }); continue; }
      const buf = await res.arrayBuffer();
      if (!buf || buf.byteLength === 0) { results.failed.push({ rel: clean, reason: 'empty body' }); continue; }
      const contentType = res.headers.get('content-type') || guessContentType(clean);
      await env.CMS_IMAGES.put(key, buf, { httpMetadata: { contentType } });
      results.migrated.push({ rel: clean, size: buf.byteLength });
    } catch (err) {
      results.failed.push({ rel: clean, reason: String(err && err.message || err) });
    }
  }

  return new Response(JSON.stringify({
    ok: results.failed.length === 0,
    counts: { migrated: results.migrated.length, skipped: results.skipped.length, failed: results.failed.length },
    results,
  }), { status: 200, headers: jsonHeaders() });
}
