// GET /api/cms/images — Liste les images dans public/images/
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/public/images?ref=${env.CMS_BRANCH || 'master'}`,
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
          JSON.stringify({ images: [] }),
          { status: 200, headers: jsonHeaders() }
        );
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.avif'];

    const images = data
      .filter((item) => {
        if (item.type !== 'file') return false;
        const ext = '.' + item.name.split('.').pop()?.toLowerCase();
        return imageExts.includes(ext);
      })
      .map((item) => ({
        name: item.name,
        url: `/images/${item.name}`,
        path: item.path,
        sha: item.sha,
        size: item.size,
      }));

    return new Response(
      JSON.stringify({ images }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la lecture des images' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
