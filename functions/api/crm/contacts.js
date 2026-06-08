// /api/crm/contacts — GET (liste) | POST (création). Mini-CRM "Prospects" (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../cms/_auth-helpers.js';

const STATUSES = ['nouveau', 'contacte', 'rdv', 'devis', 'gagne', 'perdu'];

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!env.DB) return bad('Base de données non configurée', 500);
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM contacts ORDER BY sort ASC, id ASC'
    ).all();
    return new Response(JSON.stringify({ contacts: results || [] }), {
      status: 200,
      headers: jsonHeaders(),
    });
  } catch (err) {
    return bad('Erreur lecture contacts', 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('JSON invalide');
  }

  const name = (body.name || '').toString().trim();
  if (!name) return bad('Le nom est obligatoire');
  const status = STATUSES.includes(body.status) ? body.status : 'nouveau';

  try {
    const row = await env.DB.prepare(
      `INSERT INTO contacts (name, org, phone, email, value, status, next_action, next_date, notes, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
      .bind(
        name,
        body.org ?? null,
        body.phone ?? null,
        body.email ?? null,
        body.value ?? null,
        status,
        body.next_action ?? null,
        body.next_date ?? null,
        body.notes ?? null,
        Number.isInteger(body.sort) ? body.sort : 0
      )
      .first();
    return new Response(JSON.stringify({ contact: row }), { status: 201, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur création contact', 500);
  }
}
