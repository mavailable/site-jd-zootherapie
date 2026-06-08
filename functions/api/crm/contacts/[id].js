// /api/crm/contacts/:id — PATCH (édition/déplacement) | DELETE. Mini-CRM "Prospects" (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../../cms/_auth-helpers.js';

const STATUSES = ['nouveau', 'contacte', 'rdv', 'devis', 'gagne', 'perdu'];
// Champs éditables (whitelist stricte → requête paramétrée sûre).
const EDITABLE = ['name', 'org', 'phone', 'email', 'value', 'status', 'next_action', 'next_date', 'notes', 'sort'];

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestPatch({ request, env, params }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return bad('Identifiant invalide');

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('JSON invalide');
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return bad('Statut invalide');
  }

  const sets = [];
  const values = [];
  for (const key of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (sets.length === 0) return bad('Aucun champ à modifier');
  sets.push(`updated_at = datetime('now')`);

  try {
    const row = await env.DB.prepare(
      `UPDATE contacts SET ${sets.join(', ')} WHERE id = ? RETURNING *`
    )
      .bind(...values, id)
      .first();
    if (!row) return bad('Contact introuvable', 404);
    return new Response(JSON.stringify({ contact: row }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur mise à jour contact', 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return bad('Identifiant invalide');

  try {
    await env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur suppression contact', 500);
  }
}
