// POST /api/cms/upload — Upload une image dans le bucket R2 CMS_IMAGES.
//
// L'image est ecrite sous la cle `<SITE_SLUG>/<fichier>` (pas de commit GitHub,
// pas de rebuild) puis servie immediatement via /img/<SITE_SLUG>/<fichier>
// (cf. functions/img/[[path]].js). Reponse : { url, name, size, key }.
//
// L'optimisation cote navigateur (optimizeImage.ts) ramene chaque image a
// ~150-300 Ko AVANT l'envoi. Le maxSize 10 Mo ci-dessous n'est qu'un filet si
// l'optim echoue totalement (navigateur sans canvas, image indecodable).
//
// Bindings requis : CMS_IMAGES (R2). Env requis : SITE_SLUG.
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo (filet serveur)

// Extension reelle selon le type MIME (jamais .webp pour un PNG, etc.).
function extForFile(file) {
  const byType = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/gif': 'gif',
  };
  if (byType[file.type]) return byType[file.type];
  const fromName = (file.name || '').split('.').pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{2,4}$/.test(fromName) ? fromName : 'jpg';
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  if (!env.CMS_IMAGES || !env.SITE_SLUG) {
    return new Response(
      JSON.stringify({ error: 'Stockage images non configuré' }),
      { status: 500, headers: jsonHeaders() }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Données invalides' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new Response(
      JSON.stringify({ error: 'Aucun fichier fourni' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Validation type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: 'Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, SVG, GIF' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Validation taille (filet si l'optim navigateur a echoue)
  if (file.size > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: 'Fichier trop volumineux (max 10 Mo)' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    // Nom de fichier unique : base slugifiee + timestamp base36 + extension reelle.
    const ext = extForFile(file);
    const baseName = (file.name || 'image')
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'image';
    const timestamp = Date.now().toString(36);
    const fileName = `${baseName}-${timestamp}.${ext}`;
    const key = `${env.SITE_SLUG}/${fileName}`;

    // Ecriture R2 (pas de commit, pas de rebuild).
    await env.CMS_IMAGES.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    return new Response(
      JSON.stringify({
        url: `/img/${key}`,
        name: fileName,
        size: file.size,
        key,
      }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'upload' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
