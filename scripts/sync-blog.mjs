/**
 * sync-blog.mjs
 * Génère les fichiers .md (pour Astro) à partir des .json (Keystatic).
 * Source de vérité : blog/*.json → Génère : blog/*.md
 */
import fs from 'node:fs';
import path from 'node:path';

const blogDir = path.resolve('src/content/blog');
if (!fs.existsSync(blogDir)) process.exit(0);

let count = 0;
for (const file of fs.readdirSync(blogDir)) {
  if (!file.endsWith('.json')) continue;
  const slug = file.replace('.json', '');
  const json = JSON.parse(fs.readFileSync(path.join(blogDir, file), 'utf-8'));

  const md = `---
title: "${json.title}"
description: "${json.description}"
date: ${json.date}
category: "${json.category}"
---

${json.body}
`;

  fs.writeFileSync(path.join(blogDir, `${slug}.md`), md);
  count++;
}

console.log(`[sync-blog] ${count} articles synchronisés`);
