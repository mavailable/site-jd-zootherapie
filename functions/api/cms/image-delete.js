// DELETE /api/cms/image-delete?key=<slug>/<fichier> — Supprime une image du bucket
// R2 CMS_IMAGES (pas de commit GitHub, pas de rebuild).
//
// Garde-fou : on ne supprime que sous le prefixe `<SITE_SLUG>/` (un site ne peut
// pas effacer les images d'un autre dans le bucket mutualise).
//
// Bindings requis : CMS_IMAGES (R2). Env requis : SITE_SLUG.
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestDelete({ request, env }) {
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

  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  const prefix = `${env.SITE_SLUG}/`;

  if (!key || !key.startsWith(prefix) || key.includes('..')) {
    return new Response(
      JSON.stringify({ error: 'Clé invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    await env.CMS_IMAGES.delete(key);
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la suppression' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
