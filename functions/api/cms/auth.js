// POST /api/cms/auth — Login
import { signSession, createSessionCookies, checkRateLimit, resetRateLimit, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: 'Trop de tentatives. Réessayez dans une minute.' }),
      { status: 429, headers: jsonHeaders() }
    );
  }

  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps de requête invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const { password } = body;
  if (!password || password !== env.CMS_PASSWORD) {
    return new Response(
      JSON.stringify({ error: 'Mot de passe incorrect' }),
      { status: 401, headers: jsonHeaders() }
    );
  }

  // Login réussi
  resetRateLimit(ip);
  const timestamp = Math.floor(Date.now() / 1000);
  const token = await signSession(timestamp, env.CMS_SESSION_SECRET);

  const cookies = createSessionCookies(token);
  const headers = new Headers(jsonHeaders());
  cookies.forEach(c => headers.append('Set-Cookie', c));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
