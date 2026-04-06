// DELETE /api/cms/delete?path=...&sha=... — Supprimer un fichier
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

export async function onRequestDelete({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const sha = url.searchParams.get('sha');

  if (!path || !path.startsWith('src/content/') || !path.endsWith('.json')) {
    return new Response(
      JSON.stringify({ error: 'Chemin invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  if (!sha) {
    return new Response(
      JSON.stringify({ error: 'SHA requis pour la suppression' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    const fileName = path.split('/').pop().replace('.json', '');

    const response = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'WebFactory-CMS',
        },
        body: JSON.stringify({
          message: `[CMS] Suppression ${fileName}`,
          sha,
          branch: env.CMS_BRANCH || 'master',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`GitHub API error: ${response.status} — ${JSON.stringify(error)}`);
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la suppression' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
