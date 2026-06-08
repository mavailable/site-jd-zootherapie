// /api/crm/settings — GET (lire le singleton) | PUT (écrire). Réglages CRM (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../cms/_auth-helpers.js';

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestGet({ request, env }) {
  try { await requireAuth(request, env); } catch (r) { return r; }
  if (!env.DB) return bad('Base de données non configurée', 500);
  try {
    const row = await env.DB.prepare('SELECT data FROM crm_settings WHERE id = 1').first();
    const settings = row && row.data ? JSON.parse(row.data) : null;
    return new Response(JSON.stringify({ settings }), { status: 200, headers: jsonHeaders() });
  } catch {
    return bad('Erreur lecture réglages', 500);
  }
}

export async function onRequestPut({ request, env }) {
  try { await requireAuth(request, env); } catch (r) { return r; }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);
  let body;
  try { body = await request.json(); } catch { return bad('JSON invalide'); }
  const settings = body && body.settings;
  if (!settings || !Array.isArray(settings.columns) || settings.columns.length === 0) {
    return bad('Réglages invalides (au moins une colonne)');
  }
  try {
    await env.DB.prepare(
      `INSERT INTO crm_settings (id, data, updated_at) VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
    ).bind(JSON.stringify(settings)).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
  } catch {
    return bad('Erreur écriture réglages', 500);
  }
}
