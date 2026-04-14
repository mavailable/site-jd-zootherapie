// POST /api/cms/logout — Déconnexion
import { clearSessionCookies, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestPost({ request }) {
  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  const cookies = clearSessionCookies();
  const headers = new Headers({ 'Content-Type': 'application/json' });
  cookies.forEach(c => headers.append('Set-Cookie', c));

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
