// Helpers d'authentification CMS — Cloudflare Pages Functions
// Utilise Web Crypto API (natif CF Workers, zéro deps)

const SESSION_DURATION = 86400; // 24h en secondes
const RATE_LIMIT_WINDOW = 60000; // 1 minute en ms
const RATE_LIMIT_MAX = 5;

// Store en mémoire pour le rate limiting (reset au cold start — suffisant pour MVP)
const loginAttempts = new Map();

/**
 * Signe un timestamp avec HMAC-SHA256
 */
export async function signSession(timestamp, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(String(timestamp)));
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${timestamp}.${hex}`;
}

/**
 * Vérifie un cookie de session
 * Retourne true si valide, false sinon
 */
export async function verifySession(cookie, secret) {
  if (!cookie) return false;

  const parts = cookie.split('.');
  if (parts.length !== 2) return false;

  const [timestamp, providedSig] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;

  // Vérifier expiration
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > SESSION_DURATION) return false;

  // Vérifier signature
  const expected = await signSession(ts, secret);
  const expectedSig = expected.split('.')[1];

  // Comparaison constante (timing-safe)
  if (providedSig.length !== expectedSig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < providedSig.length; i++) {
    mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Extrait le cookie cms_session de l'en-tête Cookie
 */
export function getSessionCookie(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const match = cookieHeader.match(/cms_session=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Middleware d'auth — à appeler en début de chaque endpoint protégé
 * Lance une Response 401 si non authentifié
 */
export async function requireAuth(request, env) {
  const cookie = getSessionCookie(request);
  const valid = await verifySession(cookie, env.CMS_SESSION_SECRET);
  if (!valid) {
    throw new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Crée les headers Set-Cookie pour la session
 * Retourne un array de 2 cookies :
 * - cms_session : HttpOnly (securite, non lisible par JS)
 * - cms_logged_in : non-HttpOnly (flag pour cms-edit.js, aucun secret)
 */
export function createSessionCookies(token) {
  return [
    `cms_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION}`,
    `cms_logged_in=1; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_DURATION}`,
  ];
}

/**
 * Crée les headers Set-Cookie pour supprimer la session
 */
export function clearSessionCookies() {
  return [
    'cms_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
    'cms_logged_in=; Secure; SameSite=Strict; Path=/; Max-Age=0',
  ];
}

/**
 * Vérifie le rate limiting pour le login
 * Retourne true si la requête est autorisée
 */
export function checkRateLimit(ip) {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    loginAttempts.set(ip, { windowStart: now, count: 1 });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Reset le rate limit pour une IP (après login réussi)
 */
export function resetRateLimit(ip) {
  loginAttempts.delete(ip);
}

/**
 * Hash un mot de passe avec SHA-256
 * Retourne le hash en hexadecimal
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifie un mot de passe client contre le hash stocke en KV
 * Retourne true si le mot de passe correspond, false sinon
 * Retourne false si KV non configure ou pas de mot de passe client
 */
export async function verifyClientPassword(password, env) {
  if (!env.CMS_AUTH) return false;
  const storedHash = await env.CMS_AUTH.get('client_password_hash');
  if (!storedHash) return false;
  const hash = await hashPassword(password);
  // Comparaison timing-safe
  if (hash.length !== storedHash.length) return false;
  let mismatch = 0;
  for (let i = 0; i < hash.length; i++) {
    mismatch |= hash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Genere un token de setup (HMAC-SHA256 du timestamp)
 * Format : "timestamp.signature"
 * Expire apres 48h (verifie par verifySetupToken)
 */
export async function generateSetupToken(secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  return signSession(timestamp, secret);
}

/**
 * Verifie un token de setup
 * Retourne true si valide et non expire (48h), false sinon
 */
export async function verifySetupToken(token, secret) {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [timestamp, providedSig] = parts;
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  // Expiration 48h
  const now = Math.floor(Date.now() / 1000);
  if (now - ts > 48 * 3600) return false;
  // Verifier signature HMAC
  const expected = await signSession(ts, secret);
  const expectedSig = expected.split('.')[1];
  if (!expectedSig || providedSig.length !== expectedSig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < providedSig.length; i++) {
    mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Vérifie l'origine de la requête (protection CSRF)
 */
export function checkOrigin(request) {
  const origin = request.headers.get('Origin');
  const url = new URL(request.url);

  // En dev local, pas de vérification
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;

  // L'Origin doit matcher le hostname du site
  if (!origin) return false;
  const originUrl = new URL(origin);
  return originUrl.hostname === url.hostname;
}

/**
 * Headers CORS pour les réponses JSON
 */
export function jsonHeaders() {
  return { 'Content-Type': 'application/json; charset=utf-8' };
}
