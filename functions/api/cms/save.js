// POST /api/cms/save — Sauvegarder un fichier (commit GitHub)
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

// Regex minimale Workers-compatible pour detecter du HTML dangereux dans les
// champs richtext (XSS). Pas de DOMPurify (pas dispo en Workers).
// Rejette : <script|iframe|object|embed|form|style|link|meta|frame>, handlers
// on*=, protocole javascript:.
const DANGEROUS_TAG_RE = /<\s*(script|iframe|object|embed|form|style|link|meta|frame|framest|applet)\b/i;
const DANGEROUS_HANDLER_RE = /(^|\s|<[a-z][^>]*\s)on[a-z]+\s*=/i;
const JAVASCRIPT_PROTO_RE = /javascript\s*:/i;

function stringHasDangerousHtml(str) {
  if (typeof str !== 'string') return false;
  // Early skip : si aucun '<' ni '=' ni ':' le string n'a aucun risque syntaxique
  if (!str.includes('<') && !str.includes('=') && !str.includes(':')) return false;
  if (DANGEROUS_TAG_RE.test(str)) return true;
  if (DANGEROUS_HANDLER_RE.test(str)) return true;
  if (JAVASCRIPT_PROTO_RE.test(str)) return true;
  return false;
}

function findDangerousField(value, pathPrefix = '') {
  if (typeof value === 'string') {
    return stringHasDangerousHtml(value) ? pathPrefix : null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const hit = findDangerousField(value[i], pathPrefix + '[' + i + ']');
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const k of Object.keys(value)) {
      const hit = findDangerousField(value[k], pathPrefix ? pathPrefix + '.' + k : k);
      if (hit) return hit;
    }
    return null;
  }
  return null;
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }

  if (!checkOrigin(request)) {
    return new Response(
      JSON.stringify({ error: 'Origine non autorisée' }),
      { status: 403, headers: jsonHeaders() }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Corps de requête invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const { path, content, sha, message } = body;

  // Validation du chemin
  if (!path || !path.startsWith('src/content/') || !path.endsWith('.json')) {
    return new Response(
      JSON.stringify({ error: 'Chemin invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  if (!content || typeof content !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Contenu invalide' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Sanitization HTML — rejet si un champ string contient du HTML dangereux
  // (XSS via POST bypass /admin). Regex Workers-compatible.
  const dangerousField = findDangerousField(content);
  if (dangerousField) {
    return new Response(
      JSON.stringify({
        error: 'Contenu HTML non autorisé',
        field: dangerousField,
        detail: 'Balises interdites : <script>, <iframe>, <object>, <embed>, <form>, <style>, <link>, <meta>, <frame>. Handlers on*= et protocole javascript: interdits.',
      }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    const jsonString = JSON.stringify(content, null, 2) + '\n';
    const bytes = new TextEncoder().encode(jsonString);
    const encoded = btoa(String.fromCharCode(...bytes));

    const payload = {
      message: message || `[CMS] Mise à jour ${path.split('/').pop()}`,
      content: encoded,
      branch: env.CMS_BRANCH || 'master',
    };

    // sha requis pour mise à jour (pas pour création)
    if (sha) {
      payload.sha = sha;
    }

    const response = await fetch(
      `https://api.github.com/repos/${env.CMS_REPO}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'WebFactory-CMS',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 409) {
        return new Response(
          JSON.stringify({ error: 'Conflit — le fichier a été modifié. Rechargez la page.' }),
          { status: 409, headers: jsonHeaders() }
        );
      }
      throw new Error(`GitHub API error: ${response.status} — ${JSON.stringify(error)}`);
    }

    const data = await response.json();

    // Auto-publish: fast-forward prod branch to this commit
    const devBranch = env.CMS_BRANCH || 'master';
    const prodBranch = env.CMS_PROD_BRANCH || 'master';
    if (devBranch !== prodBranch && env.AUTO_PUBLISH !== 'false') {
      fetch(
        `https://api.github.com/repos/${env.CMS_REPO}/git/refs/heads/${prodBranch}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json',
            'User-Agent': 'WebFactory-CMS',
          },
          body: JSON.stringify({ sha: data.commit.sha, force: false }),
        }
      ).catch(() => {});
    }

    return new Response(
      JSON.stringify({
        sha: data.content.sha,
        commit: data.commit.sha,
      }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de la sauvegarde' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
