// GET /img/<slug>/<fichier> — sert une image publique du bucket R2 CMS_IMAGES.
//
// Pourquoi : les images uploadees via le CMS (/api/cms/upload) sont stockees dans
// le bucket R2 `wf-cms-images` (mutualise parc, juridiction EU), namespacees par
// site sous la cle `<slug>/<fichier>`. Cette Function les sert sur le MEME domaine
// que le site (pas de CORS, pas de DNS ajoute, bon pour le SEO image), avec un cache
// immuable 1 an + edge-cache CF (le Worker ne tourne qu'au cache-miss).
//
// Public (pas de signature) : ce sont des images de contenu, permanentes et
// indexables. Le pendant PRIVE/signe/expirant (vocaux clients) vit sur le bucket
// `vocaux-clients` via /api/vocal-download — NE JAMAIS router ce bucket ici.
//
// Garde-fou : on ne sert que sous le prefixe `<env.SITE_SLUG>/`. Toute cle hors
// prefixe -> 404 (empeche un acces croise a un autre site du bucket mutualise).
//
// Bindings requis :
//   - CMS_IMAGES (R2, bucket wf-cms-images, jurisdiction EU)
// Env requis :
//   - SITE_SLUG (le slug du site) — prefixe de namespace des cles

const CACHE_CONTROL = 'public, max-age=31536000, immutable';

async function serve(context, includeBody) {
  const { request, env, params, waitUntil } = context;

  if (!env.CMS_IMAGES || !env.SITE_SLUG) {
    return new Response('Server config error', { status: 500 });
  }

  // params.path est un tableau (catch-all [[path]]) : ['<slug>', '<fichier>', ...].
  const parts = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
  const key = parts.join('/');

  // Garde-fou prefixe : on ne sert que les cles du site courant.
  const prefix = `${env.SITE_SLUG}/`;
  if (!key || !key.startsWith(prefix) || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  // Edge cache (GET seulement) : on cle sur l'URL canonique. Au HIT, le Worker ne
  // touche meme pas R2.
  const cache = caches.default;
  const cacheKey = new Request(new URL(request.url).toString(), { method: 'GET' });
  if (includeBody) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // Cache-miss : lire l'objet R2 (head pour HEAD, get pour GET).
  const obj = includeBody ? await env.CMS_IMAGES.get(key) : await env.CMS_IMAGES.head(key);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  const contentType = obj.httpMetadata?.contentType || 'application/octet-stream';
  headers.set('Content-Type', contentType);
  headers.set('Cache-Control', CACHE_CONTROL);
  if (obj.httpEtag) headers.set('ETag', obj.httpEtag);
  if (obj.size != null) headers.set('Content-Length', String(obj.size));

  if (!includeBody) {
    return new Response(null, { status: 200, headers });
  }

  const response = new Response(obj.body, { status: 200, headers });

  // Peupler l'edge cache sans bloquer la reponse client (clone : le body est un
  // stream a usage unique). Best-effort : un echec de cache ne casse pas la reponse.
  if (typeof waitUntil === 'function') {
    waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
  }

  return response;
}

export function onRequestGet(context) {
  return serve(context, true);
}

export function onRequestHead(context) {
  return serve(context, false);
}
