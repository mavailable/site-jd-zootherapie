// GET /api/cms/version?path=...&ref=SHA — Lire un fichier à un commit spécifique
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  const url = new URL(request.url);
  const path = url.searchParams.get('path');
  const ref = url.searchParams.get('ref');

  if (!path || !path.startsWith('src/content/') || !path.endsWith('.json')) {
    return new Response(
      JSON.stringify({ error: 'Chemin invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  if (!ref) {
    return new Response(
      JSON.stringify({ error: 'Référence (sha) requise' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}?ref=${ref}`,
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
          JSON.stringify({ error: 'Fichier introuvable à cette version' }),
          { status: 404, headers: jsonHeaders() }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const bytes = Uint8Array.from(atob(data.content), (c) => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const content = JSON.parse(text);

    return new Response(
      JSON.stringify({ content }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la lecture de la version' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
