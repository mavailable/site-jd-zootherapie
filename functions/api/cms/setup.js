// POST /api/cms/setup — Configurer le mot de passe client via lien unique
import {
  hashPassword,
  verifySetupToken,
  checkOrigin,
  checkRateLimit,
  jsonHeaders,
} from './_auth-helpers.js';

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

  // Rate limiting (meme pool que le login)
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

  const { password, token } = body;

  // Valider les champs
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Lien invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  if (!password || password.length < 6) {
    return new Response(
      JSON.stringify({ error: 'Le mot de passe doit contenir au moins 6 caracteres.' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Verifier le token (HMAC + expiration 48h)
  const tokenValid = await verifySetupToken(token, env.CMS_SESSION_SECRET);
  if (!tokenValid) {
    return new Response(
      JSON.stringify({ error: 'Ce lien a expire ou est invalide. Demandez un nouveau lien a votre webmaster.' }),
      { status: 401, headers: jsonHeaders() }
    );
  }

  // Verifier qu'un mot de passe n'existe pas deja (empecher reutilisation du lien)
  const existing = await env.CMS_AUTH.get('client_password_hash');
  if (existing) {
    return new Response(
      JSON.stringify({ error: 'Un mot de passe est deja configure. Utilisez la fonction "Changer mon mot de passe" depuis votre espace.' }),
      { status: 409, headers: jsonHeaders() }
    );
  }

  // Hasher et stocker le mot de passe
  const hash = await hashPassword(password);
  await env.CMS_AUTH.put('client_password_hash', hash);

  return new Response(
    JSON.stringify({ ok: true, message: 'Mot de passe configure avec succes.' }),
    { status: 200, headers: jsonHeaders() }
  );
}
