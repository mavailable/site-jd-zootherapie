// GET /api/cms/publish-status — Compare dev vs prod via GitHub API
//
// Retourne la position relative des deux branches pour permettre un
// monitoring des pannes auto-publish (divergence silencieuse master↔dev).
//
// Réponse :
// {
//   ok: true,
//   synced: bool,              // true si dev_sha === prod_sha
//   status: "identical" | "behind" | "ahead" | "diverged" | "missing_prod",
//   behind: number,            // nb de commits que prod a derrière dev
//   ahead: number,             // nb de commits que prod a devant dev
//   dev_branch: string,
//   prod_branch: string,
//   dev_sha: string,
//   prod_sha: string | null
// }
import { requireAuth, jsonHeaders } from './_auth-helpers.js';

function logError(context) {
  console.error('[cms/publish-status]', JSON.stringify({
    ts: new Date().toISOString(),
    ...context,
  }));
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  const token = env.GITHUB_TOKEN;
  const repo = env.CMS_REPO;
  if (!token || !repo) {
    return new Response(
      JSON.stringify({ ok: false, error: 'GITHUB_TOKEN ou CMS_REPO manquant' }),
      { status: 500, headers: jsonHeaders() }
    );
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': `${repo.split('/')[1]}-publish-status`,
  };

  const devBranch = env.CMS_DEV_BRANCH || 'dev';
  const prodBranch = env.CMS_PROD_BRANCH || 'master';

  // 1. SHA de dev
  const devRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/${devBranch}`,
    { headers }
  );
  if (!devRes.ok) {
    const body = await devRes.json().catch(() => ({}));
    logError({ stage: 'read_dev', repo, dev_branch: devBranch, status: devRes.status, github_message: body.message });
    return new Response(
      JSON.stringify({ ok: false, error: `Impossible de lire la branche ${devBranch}: ${body.message ?? devRes.statusText}` }),
      { status: 500, headers: jsonHeaders() }
    );
  }
  const devData = await devRes.json();
  const devSha = devData.object.sha;

  // 2. SHA de prod (peut ne pas exister)
  const prodRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/${prodBranch}`,
    { headers }
  );
  if (prodRes.status === 404 || prodRes.status === 422) {
    return new Response(
      JSON.stringify({
        ok: true,
        synced: false,
        status: 'missing_prod',
        behind: 0,
        ahead: 0,
        dev_branch: devBranch,
        prod_branch: prodBranch,
        dev_sha: devSha,
        prod_sha: null,
      }),
      { status: 200, headers: jsonHeaders() }
    );
  }
  if (!prodRes.ok) {
    const body = await prodRes.json().catch(() => ({}));
    logError({ stage: 'read_prod', repo, prod_branch: prodBranch, status: prodRes.status, github_message: body.message });
    return new Response(
      JSON.stringify({ ok: false, error: `Impossible de lire la branche ${prodBranch}: ${body.message ?? prodRes.statusText}` }),
      { status: 500, headers: jsonHeaders() }
    );
  }
  const prodData = await prodRes.json();
  const prodSha = prodData.object.sha;

  if (devSha === prodSha) {
    return new Response(
      JSON.stringify({
        ok: true,
        synced: true,
        status: 'identical',
        behind: 0,
        ahead: 0,
        dev_branch: devBranch,
        prod_branch: prodBranch,
        dev_sha: devSha,
        prod_sha: prodSha,
      }),
      { status: 200, headers: jsonHeaders() }
    );
  }

  // 3. Compare via /compare — base=prod, head=dev  -> renvoie ahead_by/behind_by du point de vue de head (dev)
  //    ahead_by = nb commits que dev a devant prod
  //    behind_by = nb commits que dev a derrière prod
  //    On retourne du point de vue de prod : behind=ahead_by(dev), ahead=behind_by(dev)
  const compareRes = await fetch(
    `https://api.github.com/repos/${repo}/compare/${prodBranch}...${devBranch}`,
    { headers }
  );
  if (!compareRes.ok) {
    const body = await compareRes.json().catch(() => ({}));
    logError({ stage: 'compare', repo, dev_branch: devBranch, prod_branch: prodBranch, status: compareRes.status, github_message: body.message });
    return new Response(
      JSON.stringify({ ok: false, error: `Impossible de comparer ${prodBranch}...${devBranch}: ${body.message ?? compareRes.statusText}` }),
      { status: 500, headers: jsonHeaders() }
    );
  }
  const compareData = await compareRes.json();
  const behind = compareData.ahead_by ?? 0;   // combien de commits prod doit encaisser pour rattraper dev
  const ahead = compareData.behind_by ?? 0;   // combien de commits prod a en plus que dev (divergence)

  let status;
  if (ahead > 0 && behind > 0) status = 'diverged';
  else if (ahead > 0) status = 'ahead';
  else if (behind > 0) status = 'behind';
  else status = 'identical';

  return new Response(
    JSON.stringify({
      ok: true,
      synced: false,
      status,
      behind,
      ahead,
      dev_branch: devBranch,
      prod_branch: prodBranch,
      dev_sha: devSha,
      prod_sha: prodSha,
    }),
    { status: 200, headers: jsonHeaders() }
  );
}
