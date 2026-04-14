// POST /api/cms/auth — Login (dual password : client KV + admin env)
import {
  signSession,
  createSessionCookies,
  checkRateLimit,
  resetRateLimit,
  checkOrigin,
  jsonHeaders,
  verifyClientPassword,
} from './_auth-helpers.js';

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Trop de tentatives. Reessayez dans une minute.' }),
      { status: 429, headers: jsonHeaders() }
    );
  }

  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisee' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps de requete invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const { password } = body;
  if (!password) {
    return new Response(
      JSON.stringify({ error: 'Mot de passe requis' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // --- Dual password check ---
  let role = null;

  // 1. Check client password (KV)
  if (await verifyClientPassword(password, env)) {
    role = 'client';
  }

  // 2. Check admin password (env var)
  if (!role && env.CMS_ADMIN_PASSWORD && password === env.CMS_ADMIN_PASSWORD) {
    role = 'admin';
  }

  if (!role) {
    return new Response(
      JSON.stringify({ error: 'Mot de passe incorrect' }),
      { status: 401, headers: jsonHeaders() }
    );
  }

  // Login reussi
  resetRateLimit(ip);
  const timestamp = Math.floor(Date.now() / 1000);
  const token = await signSession(timestamp, env.CMS_SESSION_SECRET);

  const cookies = createSessionCookies(token);
  const headers = new Headers(jsonHeaders());
  cookies.forEach((c) => headers.append('Set-Cookie', c));

  // Le role est inclus dans la reponse (V1 : informatif, V2 : acces differencies)
  return new Response(JSON.stringify({ ok: true, role }), {
    status: 200,
    headers,
  });
}
