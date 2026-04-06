// GET /api/cms/history?path=src/content/hero/index.json — Historique des modifications d'un fichier
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
      `https://api.github.com/repos/${env.CMS_REPO}/commits?path=${encodeURIComponent(path)}&sha=${env.CMS_BRANCH || 'master'}&per_page=20`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'WebFactory-CMS',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const commits = await response.json();

    const history = commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      date: c.commit.committer.date,
      author: c.commit.committer.name,
    }));

    return new Response(
      JSON.stringify({ history }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de la lecture de l'historique" }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
