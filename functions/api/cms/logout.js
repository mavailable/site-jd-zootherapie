// POST /api/cms/logout — Déconnexion
import { clearSessionCookie, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestPost({ request }) {
  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearSessionCookie(),
    },
  });
}
