// GET /api/cms/session — Vérifier la session
import { getSessionCookie, verifySession, jsonHeaders } from './_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  const cookie = getSessionCookie(request);
  const valid = await verifySession(cookie, env.CMS_SESSION_SECRET);

  return new Response(
    JSON.stringify({ valid }),
    { status: valid ? 200 : 401, headers: jsonHeaders() }
  );
}
