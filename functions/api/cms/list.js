// GET /api/cms/list?path=src/content/services — Lister les fichiers d'une collection
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path');

  if (!path || !path.startsWith('src/content/')) {
    return new Response(
      JSON.stringify({ error: 'Chemin invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}?ref=${env.CMS_BRANCH || 'master'}`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'WebFactory-CMS',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ files: [] }),
          { status: 200, headers: jsonHeaders() }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      return new Response(
        JSON.stringify({ error: 'Le chemin ne pointe pas vers un dossier' }),
        { status: 400, headers: jsonHeaders() }
      );
    }

    const files = data
      .filter((item) => item.type === 'file' && item.name.endsWith('.json'))
      .map((item) => ({ name: item.name, sha: item.sha }));

    return new Response(
      JSON.stringify({ files }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la lecture du dossier' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
