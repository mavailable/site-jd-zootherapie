// skills/mkt-social-plan/templates/marketing-plan.js
// ↳ copié par mkt-social-plan vers projets/<slug>/site/functions/api/cms/marketing-plan.js
// POST /api/cms/marketing-plan — patch un post du plan marketing (status/published_at/client_modified_text/client_comment)

import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

// Whitelist stricte des champs modifiables par la cliente via /admin.
// Tout autre champ rejetté (pas d'injection de nouveaux posts, pas de modif du text généré).
const PATCH_ALLOWED_FIELDS = new Set([
  'status',
  'published_at',
  'client_modified_text',
  'client_comment',
]);

const VALID_STATUSES = new Set(['draft', 'published', 'skipped']);
const MAX_TEXT_LEN = 5000;

// Rate limit in-memory (par IP) — 10 req/min.
// Note : Workers sont éphémères, donc rate limit best-effort. Pour robustesse, bascule sur KV/DO plus tard.
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 10;
const rateLimitMap = new Map(); // ip → [timestamp, ...]

function isRateLimited(ip) {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT) {
    rateLimitMap.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return false;
}

function validatePatch(patch) {
  if (!patch || typeof patch !== 'object') return 'patch must be an object';
  const keys = Object.keys(patch);
  for (const k of keys) {
    if (!PATCH_ALLOWED_FIELDS.has(k)) return `field "${k}" not allowed`;
  }
  if ('status' in patch && !VALID_STATUSES.has(patch.status)) {
    return `invalid status "${patch.status}"`;
  }
  if ('published_at' in patch && patch.published_at !== null && typeof patch.published_at !== 'string') {
    return 'published_at must be string or null';
  }
  if ('client_modified_text' in patch) {
    if (patch.client_modified_text !== null && typeof patch.client_modified_text !== 'string') {
      return 'client_modified_text must be string or null';
    }
    if (patch.client_modified_text && patch.client_modified_text.length > MAX_TEXT_LEN) {
      return `client_modified_text max ${MAX_TEXT_LEN} chars`;
    }
  }
  if ('client_comment' in patch) {
    if (patch.client_comment !== null && typeof patch.client_comment !== 'string') {
      return 'client_comment must be string or null';
    }
    if (patch.client_comment && patch.client_comment.length > MAX_TEXT_LEN) {
      return `client_comment max ${MAX_TEXT_LEN} chars`;
    }
  }
  return null;
}

function planPath(trimester) {
  // Garde-fou sur le format YYYY-Q[1-4]
  if (!/^\d{4}-Q[1-4]$/.test(trimester)) return null;
  // Path dans le repo du site client (servi statiquement via /marketing-data/ en prod CF Pages)
  return `public/marketing-data/plan-${trimester}.json`;
}

async function githubRead(env, path) {
  const url = `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}?ref=${env.CMS_BRANCH}`;
  const r = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'marketing-plan-endpoint',
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (r.status === 404) return { sha: null, content: null };
  if (!r.ok) throw new Error(`github read ${r.status}`);
  const j = await r.json();
  const content = JSON.parse(atob(j.content.replace(/\n/g, '')));
  return { sha: j.sha, content };
}

async function githubWrite(env, path, content, sha, message) {
  const url = `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}`;
  const body = {
    message,
    branch: env.CMS_BRANCH,
    content: btoa(JSON.stringify(content, null, 2)),
    sha: sha || undefined,
  };
  const r = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      'User-Agent': 'marketing-plan-endpoint',
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`github write ${r.status}: ${t}`);
  }
  return r.json();
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  if (!checkOrigin(request)) {
    return new Response(JSON.stringify({ error: 'origin_rejected' }), {
      status: 403,
      headers: jsonHeaders(),
    });
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'rate_limited' }), {
      status: 429,
      headers: jsonHeaders(),
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const { trimester, post_id, patch } = body;

  if (typeof trimester !== 'string' || typeof post_id !== 'string') {
    return new Response(JSON.stringify({ error: 'missing_fields' }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const path = planPath(trimester);
  if (!path) {
    return new Response(JSON.stringify({ error: 'invalid_trimester' }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  const patchErr = validatePatch(patch);
  if (patchErr) {
    return new Response(JSON.stringify({ error: patchErr }), {
      status: 400,
      headers: jsonHeaders(),
    });
  }

  // Retry 1x en cas de conflit SHA
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { sha, content } = await githubRead(env, path);
      if (!content) {
        return new Response(JSON.stringify({ error: 'plan_not_found' }), {
          status: 404,
          headers: jsonHeaders(),
        });
      }
      const idx = content.posts.findIndex((p) => p.id === post_id);
      if (idx === -1) {
        return new Response(JSON.stringify({ error: 'post_not_found' }), {
          status: 404,
          headers: jsonHeaders(),
        });
      }
      // Apply patch
      content.posts[idx] = { ...content.posts[idx], ...patch };
      const msg = `admin: update post ${post_id} ${Object.keys(patch).join(',')}`;
      await githubWrite(env, path, content, sha, msg);
      return new Response(JSON.stringify({ ok: true, post: content.posts[idx] }), {
        status: 200,
        headers: jsonHeaders(),
      });
    } catch (err) {
      const msg = String(err?.message || err);
      if (msg.includes('409') && attempt === 0) {
        continue; // retry conflict once
      }
      return new Response(JSON.stringify({ error: 'internal', detail: msg }), {
        status: 500,
        headers: jsonHeaders(),
      });
    }
  }

  return new Response(JSON.stringify({ error: 'max_retries' }), {
    status: 500,
    headers: jsonHeaders(),
  });
}
