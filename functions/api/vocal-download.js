// GET /api/vocal-download?k=<r2Key>&e=<expires>&s=<sig>
//
// Sert un fichier vocal depuis R2 si la signature HMAC est valide et non expirée.
// Le lien est dans le mail de notif à Marc — un click le télécharge dans ~/Downloads/.
//
// Auth : signature HMAC (pas de cookie). Le HMAC est calculé à l'upload sur "<r2Key>.<expires>".
// Pas de timing-safe comparison pour la sig (URL publique, blast radius = ce fichier vocal seul).
//
// Env requis :
//   - VOCAUX_SIGNING_KEY (partagé avec /api/vocal-upload)
// Bindings :
//   - VOCAUX (R2)

async function hmacSign(key, data) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const k = url.searchParams.get('k');
  const e = url.searchParams.get('e');
  const s = url.searchParams.get('s');

  if (!k || !e || !s) {
    return new Response('Missing params', { status: 400 });
  }
  if (!env.VOCAUX || !env.VOCAUX_SIGNING_KEY) {
    return new Response('Server config error', { status: 500 });
  }

  // Expiration
  const expires = parseInt(e, 10);
  if (Number.isNaN(expires) || Math.floor(Date.now() / 1000) > expires) {
    return new Response('Link expired', { status: 410 });
  }

  // Signature
  const expectedSig = await hmacSign(env.VOCAUX_SIGNING_KEY, `${k}.${expires}`);
  if (expectedSig !== s) {
    return new Response('Invalid signature', { status: 403 });
  }

  // Fetch R2
  const obj = await env.VOCAUX.get(k);
  if (!obj) {
    return new Response('Not found', { status: 404 });
  }

  const filename = k.split('/').pop() || 'vocal.webm';
  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'application/octet-stream');
  headers.set('Content-Disposition', `attachment; filename="${filename}"`);
  headers.set('Cache-Control', 'private, max-age=3600');
  if (obj.size) headers.set('Content-Length', String(obj.size));

  return new Response(obj.body, { status: 200, headers });
}
