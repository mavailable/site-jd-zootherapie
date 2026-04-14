// POST /api/cms/change-password — Changer le mot de passe client (auth requise)
import {
  requireAuth,
  hashPassword,
  verifyClientPassword,
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

  // Auth requise
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  // Verifier que KV est configure
  if (!env.CMS_AUTH) {
    return new Response(
      JSON.stringify({ error: 'Configuration non disponible. Contactez votre webmaster.' }),
      { status: 503, headers: jsonHeaders() }
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

  const { currentPassword, newPassword } = body;

  if (!currentPassword || !newPassword) {
    return new Response(
      JSON.stringify({ error: 'Les deux mots de passe sont requis.' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  if (newPassword.length < 6) {
    return new Response(
      JSON.stringify({ error: 'Le nouveau mot de passe doit contenir au moins 6 caracteres.' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Verifier le mot de passe actuel
  // On accepte soit le mot de passe client KV, soit le mot de passe admin
  const isClientPassword = await verifyClientPassword(currentPassword, env);
  const isAdminPassword = env.CMS_ADMIN_PASSWORD && currentPassword === env.CMS_ADMIN_PASSWORD;

  if (!isClientPassword && !isAdminPassword) {
    return new Response(
      JSON.stringify({ error: 'Mot de passe actuel incorrect.' }),
      { status: 401, headers: jsonHeaders() }
    );
  }

  // Hasher et stocker le nouveau mot de passe
  const hash = await hashPassword(newPassword);
  await env.CMS_AUTH.put('client_password_hash', hash);

  return new Response(
    JSON.stringify({ ok: true, message: 'Mot de passe modifie avec succes.' }),
    { status: 200, headers: jsonHeaders() }
  );
}
