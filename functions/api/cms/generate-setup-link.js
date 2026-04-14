// POST /api/cms/generate-setup-link — Generer un lien de configuration client (admin only)
import {
  requireAuth,
  generateSetupToken,
  checkOrigin,
  jsonHeaders,
} from './_auth-helpers.js';

export async function onRequestPost({ request, env }) {
  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisee' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  // Auth requise (admin connecte)
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  // Verifier que KV est configure
  if (!env.CMS_AUTH) {
    return new Response(
      JSON.stringify({ error: 'KV namespace CMS_AUTH non configure. Voir SETUP.md.' }),
      { status: 503, headers: jsonHeaders() }
    );
  }

  // Optionnel : forcer la regeneration meme si un mot de passe existe
  let body = {};
  try {
    body = await request.json();
  } catch {
    // pas de body = OK, on utilise les defaults
  }
  const force = body.force === true;

  // Verifier si un mot de passe client existe deja
  const existing = await env.CMS_AUTH.get('client_password_hash');
  if (existing && !force) {
    return new Response(
      JSON.stringify({
        error: 'Un mot de passe client est deja configure. Utilisez { "force": true } pour generer un lien de reinitialisation.',
        hasClientPassword: true,
      }),
      { status: 409, headers: jsonHeaders() }
    );
  }

  // Si force, supprimer l'ancien hash pour permettre la reconfiguration
  if (existing && force) {
    await env.CMS_AUTH.delete('client_password_hash');
  }

  // Generer le token
  const token = await generateSetupToken(env.CMS_SESSION_SECRET);
  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;
  const setupUrl = `${origin}/admin/setup?token=${token}`;

  return new Response(
    JSON.stringify({
      ok: true,
      url: setupUrl,
      expiresIn: '48h',
      message: 'Envoyez ce lien au client. Il pourra configurer son mot de passe.',
    }),
    { status: 200, headers: jsonHeaders() }
  );
}
