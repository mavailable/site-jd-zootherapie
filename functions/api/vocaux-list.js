// GET /api/vocaux-list — Liste des vocaux envoyés (pour affichage dans /admin)
//
// Auth : cookie HttpOnly cms_session (requireAuth) — seul le client connecté voit ses vocaux
// Lit src/content/vocaux/index.json depuis le repo GitHub (source de vérité)
// Réponse : { entries: [{ id, sujet, filename, vocal_url, audio_bytes, uploaded_at, statut }] }

import { requireAuth, jsonHeaders } from './cms/_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (authError) {
    return authError;
  }

  if (!env.CMS_REPO || !env.GITHUB_TOKEN) {
    return new Response(JSON.stringify({ entries: [] }), { status: 200, headers: jsonHeaders() });
  }

  const vocauxPath = 'src/content/vocaux/index.json';
  const branch = env.CMS_BRANCH || 'master';

  try {
    const resp = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${vocauxPath}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'WebFactory-Vocaux',
        },
      }
    );

    if (resp.status === 404) {
      return new Response(JSON.stringify({ entries: [] }), { status: 200, headers: jsonHeaders() });
    }
    if (!resp.ok) {
      return new Response(JSON.stringify({ entries: [], error: `GitHub ${resp.status}` }), { status: 200, headers: jsonHeaders() });
    }

    const data = await resp.json();
    const decoded = atob(data.content.replace(/\n/g, ''));
    const parsed = JSON.parse(decoded);
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];

    // Strip r2_key des entries (au niveau racine et dans attachments[]) — garde le binding R2 invisible.
    // Tolère le schéma legacy (entry.r2_key + entry.vocal_url à plat) et le nouveau (attachments[]).
    const sanitized = entries.map((e) => {
      const { r2_key, attachments, ...rest } = e;
      const cleanAttachments = Array.isArray(attachments)
        ? attachments.map(({ r2_key: _rk, ...attRest }) => attRest)
        : undefined;
      return cleanAttachments ? { ...rest, attachments: cleanAttachments } : rest;
    });

    return new Response(JSON.stringify({ entries: sanitized }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return new Response(JSON.stringify({ entries: [], error: err.message }), { status: 200, headers: jsonHeaders() });
  }
}
