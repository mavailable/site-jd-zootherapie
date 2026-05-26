// GET /api/cms/sync-status — Compare dev and prod branch SHAs
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  const devBranch = env.CMS_BRANCH || 'dev';
  const prodBranch = env.CMS_PROD_BRANCH || 'master';

  if (devBranch === prodBranch) {
    return new Response(
      JSON.stringify({ synced: true, branch: devBranch }),
      { headers: jsonHeaders() }
    );
  }

  const ghHeaders = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'WebFactory-CMS',
  };

  try {
    const [devRes, prodRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${env.CMS_REPO}/git/refs/heads/${devBranch}`, { headers: ghHeaders }),
      fetch(`https://api.github.com/repos/${env.CMS_REPO}/git/refs/heads/${prodBranch}`, { headers: ghHeaders }),
    ]);

    if (!devRes.ok || !prodRes.ok) {
      return new Response(
        JSON.stringify({ synced: true, error: 'Impossible de verifier' }),
        { headers: jsonHeaders() }
      );
    }

    const devData = await devRes.json();
    const prodData = await prodRes.json();
    const synced = devData.object.sha === prodData.object.sha;

    return new Response(
      JSON.stringify({ synced }),
      { headers: jsonHeaders() }
    );
  } catch {
    return new Response(
      JSON.stringify({ synced: true, error: 'Impossible de verifier' }),
      { headers: jsonHeaders() }
    );
  }
}
