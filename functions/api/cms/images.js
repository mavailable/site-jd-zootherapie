// GET /api/cms/images — Liste les images du site dans le bucket R2 CMS_IMAGES.
//
// Liste les objets sous le prefixe `<SITE_SLUG>/` (chaque site ne voit que ses
// images dans le bucket mutualise). Tri par date d'upload decroissante.
// Reponse : { images: [{ name, url, size, key }] }.
//
// Bindings requis : CMS_IMAGES (R2). Env requis : SITE_SLUG.
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif'];

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  if (!env.CMS_IMAGES || !env.SITE_SLUG) {
    return new Response(
      JSON.stringify({ error: 'Stockage images non configuré' }),
      { status: 500, headers: jsonHeaders() }
    );
  }

  const prefix = `${env.SITE_SLUG}/`;

  try {
    // Pagination R2 (truncated/cursor) pour ne rien rater au-dela de 1000 objets.
    const objects = [];
    let cursor;
    do {
      const listed = await env.CMS_IMAGES.list({ prefix, cursor });
      objects.push(...listed.objects);
      cursor = listed.truncated ? listed.cursor : undefined;
    } while (cursor);

    const images = objects
      .filter((obj) => {
        const name = obj.key.slice(prefix.length);
        if (!name || name.includes('/')) return true; // garde les sous-dossiers eventuels
        const ext = '.' + name.split('.').pop()?.toLowerCase();
        return IMAGE_EXTS.includes(ext);
      })
      .map((obj) => ({
        name: obj.key.slice(prefix.length),
        url: `/img/${obj.key}`,
        size: obj.size,
        key: obj.key,
        uploaded: obj.uploaded,
      }))
      // Tri par date d'upload decroissante (plus recent en premier).
      .sort((a, b) => new Date(b.uploaded).getTime() - new Date(a.uploaded).getTime());

    return new Response(
      JSON.stringify({ images }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la lecture des images' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
