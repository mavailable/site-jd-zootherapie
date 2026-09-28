// Landing pages publiees ET ouvertes aux robots : meme regle que la route
// /lp/[...slug] (enabled !== false), que le sitemap (indexable) et que
// public/robots.txt (Disallow: /lp/ sauf Allow explicite). Une LP fermee aux
// robots n'est jamais annoncee aux IA.
import fs from 'node:fs';
import path from 'node:path';
import { getCollection } from 'astro:content';

export async function getLandingPagesOuvertes() {
  const robots = fs.readFileSync(path.join(process.cwd(), 'public', 'robots.txt'), 'utf-8');
  const lps = await getCollection('landing-pages', ({ data }) => data.enabled !== false && data.indexable !== false);
  return lps.filter((lp) => robots.includes(`Allow: /lp/${lp.data.slug}/`));
}
