// POST /api/cms/upload — Upload une image via GitHub API
// L'image est commitée dans public/images/ du repo
import { requireAuth, checkOrigin, jsonHeaders } from './_auth-helpers.js';

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

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Données invalides' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    return new Response(
      JSON.stringify({ error: 'Aucun fichier fourni' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  // Validation
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return new Response(
      JSON.stringify({ error: 'Type de fichier non autorisé. Formats acceptés : JPG, PNG, WebP, SVG, GIF' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (file.size > maxSize) {
    return new Response(
      JSON.stringify({ error: 'Fichier trop volumineux (max 5 Mo)' }),
      { status: 400, headers: jsonHeaders() }
    );
  }

  try {
    // Générer un nom de fichier unique
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const baseName = file.name
      .replace(/\.[^.]+$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const timestamp = Date.now().toString(36);
    const fileName = `${baseName}-${timestamp}.${ext}`;
    const path = `public/images/${fileName}`;

    // Convertir en base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    // Commit vers GitHub
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
        body: JSON.stringify({
          message: `[CMS] Upload ${fileName}`,
          content: base64,
          branch: env.CMS_BRANCH || 'master',
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      throw new Error(`GitHub API error: ${response.status} — ${JSON.stringify(err)}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify({
        url: `/images/${fileName}`,
        path,
        sha: data.content.sha,
        name: fileName,
        size: file.size,
      }),
      { status: 200, headers: jsonHeaders() }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erreur lors de l\'upload' }),
      { status: 500, headers: jsonHeaders() }
    );
  }
}
