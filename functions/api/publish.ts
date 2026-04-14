import { requireAuth, checkOrigin, jsonHeaders } from './cms/_auth-helpers.js';

type PublishEnv = {
  GITHUB_TOKEN: string;
  CMS_SESSION_SECRET: string;
  CMS_REPO: string;
  CMS_DEV_BRANCH?: string;
  CMS_PROD_BRANCH?: string;
};

// Log structuré pour consultation via `wrangler pages deployment tail`
// ou via MCP cloudflare. Ne contient jamais de secret.
function logPublishError(context: Record<string, unknown>) {
  console.error('[cms/publish]', JSON.stringify({
    ts: new Date().toISOString(),
    ...context,
  }));
}

export const onRequestPost: PagesFunction<PublishEnv> = async ({ request, env }) => {
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

  const devBranch = env.CMS_DEV_BRANCH || 'dev';
  const prodBranch = env.CMS_PROD_BRANCH || 'master';

  // 1. Récupère le SHA actuel de la branche source (dev)
  //    Les erreurs réseau / auth (401/403) remontent telles quelles — pas de catch global silencieux.
  const devRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/${devBranch}`,
    { headers }
  );
  if (!devRes.ok) {
    const body = await devRes.json().catch(() => ({})) as { message?: string };
    logPublishError({
      stage: 'read_dev_branch',
      repo,
      dev_branch: devBranch,
      status: devRes.status,
      github_message: body.message,
    });
    return Response.json(
      { ok: false, error: `Impossible de lire la branche ${devBranch}: ${body.message ?? devRes.statusText}` },
      { status: 500 }
    );
  }
  const devData = await devRes.json() as { object: { sha: string } };
  const devSha = devData.object.sha;

  // 2. Tente de fast-forward la branche de prod sur le SHA de dev
  const patchRes = await fetch(
    `https://api.github.com/repos/${repo}/git/refs/heads/${prodBranch}`,
    { method: 'PATCH', headers, body: JSON.stringify({ sha: devSha, force: false }) }
  );

  if (patchRes.ok) {
    return Response.json({ ok: true, dev_sha: devSha, prod_branch: prodBranch });
  }

  // 3. Analyse du 422 — GitHub renvoie 422 dans PLUSIEURS cas distincts :
  //    a) "Reference does not exist"       -> la branche prod n'existe pas, on la crée
  //    b) "Update is not a fast forward"    -> master a divergé de dev, résolution manuelle requise
  //    c) autre message                     -> cas inattendu, on renvoie le message brut
  if (patchRes.status === 422) {
    const errBody = await patchRes.json().catch(() => ({})) as { message?: string };
    const ghMsg = errBody.message ?? '';

    // Cas b) Divergence master / dev — NE PAS silencieusement échouer.
    //        On lit le SHA actuel de master pour le reporter.
    if (/not a fast forward/i.test(ghMsg) || /fast[- ]forward/i.test(ghMsg)) {
      let masterSha: string | null = null;
      try {
        const masterRes = await fetch(
          `https://api.github.com/repos/${repo}/git/refs/heads/${prodBranch}`,
          { headers }
        );
        if (masterRes.ok) {
          const masterData = await masterRes.json() as { object: { sha: string } };
          masterSha = masterData.object.sha;
        }
      } catch {
        // Non bloquant : on remonte la divergence même sans le SHA master
      }

      logPublishError({
        stage: 'patch_prod_branch',
        reason: 'diverged',
        repo,
        dev_branch: devBranch,
        prod_branch: prodBranch,
        dev_sha: devSha,
        master_sha: masterSha,
        github_message: ghMsg,
      });

      return Response.json(
        {
          ok: false,
          error: `La branche ${prodBranch} a divergé de ${devBranch}. Résolution manuelle requise (merge ${prodBranch} → ${devBranch} ou rebase).`,
          divergence: true,
          dev_branch: devBranch,
          prod_branch: prodBranch,
          dev_sha: devSha,
          master_sha: masterSha,
          github_message: ghMsg,
        },
        { status: 409 }
      );
    }

    // Cas a) Branche prod absente — on la crée.
    if (/Reference does not exist/i.test(ghMsg)) {
      const createRes = await fetch(
        `https://api.github.com/repos/${repo}/git/refs`,
        { method: 'POST', headers, body: JSON.stringify({ ref: `refs/heads/${prodBranch}`, sha: devSha }) }
      );
      if (createRes.ok) {
        return Response.json({ ok: true, created_branch: prodBranch, dev_sha: devSha });
      }
      const createErr = await createRes.json().catch(() => ({})) as { message?: string };
      logPublishError({
        stage: 'create_prod_branch',
        repo,
        prod_branch: prodBranch,
        dev_sha: devSha,
        status: createRes.status,
        github_message: createErr.message,
      });
      return Response.json(
        { ok: false, error: createErr.message ?? `Erreur création ${prodBranch}` },
        { status: 500 }
      );
    }

    // Cas c) 422 inattendu — on remonte le message brut de GitHub.
    logPublishError({
      stage: 'patch_prod_branch',
      reason: 'unexpected_422',
      repo,
      dev_branch: devBranch,
      prod_branch: prodBranch,
      dev_sha: devSha,
      github_message: ghMsg,
    });
    return Response.json(
      { ok: false, error: `422 inattendu de GitHub: ${ghMsg || 'message vide'}`, github_message: ghMsg },
      { status: 500 }
    );
  }

  // 4. Autres codes d'erreur (401 token invalide, 403 quota / repo, 404 repo, 5xx GitHub down)
  //    -> on propage tel quel avec contexte loggé.
  const err = await patchRes.json().catch(() => ({})) as { message?: string };
  logPublishError({
    stage: 'patch_prod_branch',
    reason: 'non_422_error',
    repo,
    dev_branch: devBranch,
    prod_branch: prodBranch,
    dev_sha: devSha,
    status: patchRes.status,
    github_message: err.message,
  });
  return Response.json(
    { ok: false, error: err.message ?? `Erreur GitHub ${patchRes.status}` },
    { status: patchRes.status >= 400 && patchRes.status < 600 ? patchRes.status : 500 }
  );
};
