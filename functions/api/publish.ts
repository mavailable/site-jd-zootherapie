const OWNER = 'mavailable';
const REPO = 'site-jd-zootherapie';

export const onRequestPost: PagesFunction<{ GITHUB_TOKEN: string }> = async ({ env }) => {
  const token = env.GITHUB_TOKEN;
  if (!token) {
    return Response.json({ ok: false, error: 'GITHUB_TOKEN manquant' }, { status: 500 });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
    'User-Agent': `${REPO}-publish`,
  };

  // 1. Recupere le SHA actuel de dev
  const devRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/dev`,
    { headers }
  );
  if (!devRes.ok) {
    return Response.json({ ok: false, error: 'Impossible de lire la branche dev' }, { status: 500 });
  }
  const devData = await devRes.json() as { object: { sha: string } };
  const sha = devData.object.sha;

  // 2. Tente de mettre a jour master (fast-forward)
  const patchRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/refs/heads/master`,
    { method: 'PATCH', headers, body: JSON.stringify({ sha, force: false }) }
  );

  if (patchRes.ok) {
    return Response.json({ ok: true });
  }

  // 3. Si master n'existe pas (422), on la cree
  if (patchRes.status === 422) {
    const createRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/git/refs`,
      { method: 'POST', headers, body: JSON.stringify({ ref: 'refs/heads/master', sha }) }
    );
    if (createRes.ok) {
      return Response.json({ ok: true });
    }
    const err = await createRes.json() as { message?: string };
    return Response.json({ ok: false, error: err.message ?? 'Erreur creation master' }, { status: 500 });
  }

  const err = await patchRes.json() as { message?: string };
  return Response.json({ ok: false, error: err.message ?? 'Erreur inconnue' }, { status: 500 });
};
