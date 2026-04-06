import { requireAuth, checkOrigin, jsonHeaders } from './cms/_auth-helpers.js';

export const onRequestPost: PagesFunction<{ GITHUB_TOKEN: string; CMS_SESSION_SECRET: string; CMS_REPO: string }> = async ({ request, env }) => {
  // Auth check
  try {
    await requireAuth(request, env);
  } catch (authError) {
    return authError as Response;
  }

  // CSRF check
  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  const token = env.GITHUB_TOKEN;
  const repo = env.CMS_REPO;
  if (!token || !repo) {
    return Response.json({ ok: false, error: 'GITHUB_TOKEN ou CMS_REPO manquant' }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': `${repo.split('/')[1]}-publish`,
  };

  // 1. Récupère le SHA actuel de dev
  const devRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/dev`,
    { headers }
  );
  if (!devRes.ok) {
    return Response.json({ ok: false, error: 'Impossible de lire la branche dev' }, { status: 500 });
  }
  const devData = await devRes.json() as { object: { sha: string } };
  const sha = devData.object.sha;

  // 2. Tente de mettre à jour master
  const patchRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/master`,
    { method: 'PATCH', headers, body: JSON.stringify({ sha, force: false }) }
  );

  if (patchRes.ok) {
    return Response.json({ ok: true });
  }

  // 3. Si master n'existe pas (422), on la crée
  if (patchRes.status === 422) {
    const createRes = await fetch(
      `https://api.github.com/repos/${repo}/git/refs`,
      { method: 'POST', headers, body: JSON.stringify({ ref: 'refs/heads/master', sha }) }
    );
    if (createRes.ok) {
      return Response.json({ ok: true });
    }
    const err = await createRes.json() as { message?: string };
    return Response.json({ ok: false, error: err.message ?? 'Erreur création master' }, { status: 500 });
  }

  const err = await patchRes.json() as { message?: string };
  return Response.json({ ok: false, error: err.message ?? 'Erreur inconnue' }, { status: 500 });
};
