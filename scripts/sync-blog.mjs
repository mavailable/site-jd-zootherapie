/**
 * sync-blog.mjs
 * Synchronise les articles de blog entre Keystatic (.mdoc) et Astro (.md).
 * Keystatic écrit dans blog/slug/index.mdoc, Astro lit blog/slug.md.
 * Ce script copie les .mdoc en .md plats pour le build Astro.
 */
import fs from 'node:fs';
import path from 'node:path';

const blogDir = path.resolve('src/content/blog');

if (!fs.existsSync(blogDir)) process.exit(0);

const entries = fs.readdirSync(blogDir, { withFileTypes: true });

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  const mdocPath = path.join(blogDir, entry.name, 'index.mdoc');
  const mdPath = path.join(blogDir, `${entry.name}.md`);

  if (fs.existsSync(mdocPath)) {
    fs.copyFileSync(mdocPath, mdPath);
  }
}

console.log(`[sync-blog] ${entries.filter(e => e.isDirectory()).length} articles synchronisés`);
