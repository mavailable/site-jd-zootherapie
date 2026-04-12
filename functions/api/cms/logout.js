// POST /api/cms/logout — Déconnexion
import { clearSessionCookie, clearSessionFlag, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestPost({ request }) {
  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  const headers = new Headers({ 'Content-Type': 'application/json' });
  headers.append('Set-Cookie', clearSessionCookie());
  headers.append('Set-Cookie', clearSessionFlag());

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers,
  });
}
