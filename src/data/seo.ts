// src/data/seo.ts — Helper SEO page-level (C2 SeoEditor wiring)
// Lit src/content/seo/index.json avec cache memoire.
// Source de verite pour title/description/ogImage/noindex par page,
// editable par le client via /admin#/seo.

import fs from 'node:fs';
import path from 'node:path';

export interface PageSeo {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
}

export interface SeoGlobal {
  siteName: string;
  separator: string;
  defaultOgImage: string;
}

interface SeoData {
  global: SeoGlobal;
  pages: Record<string, PageSeo>;
}

let cache: SeoData | null | undefined = undefined;

function loadSeo(): SeoData | null {
  if (cache !== undefined) return cache;
  try {
    const filePath = path.join(process.cwd(), 'src', 'content', 'seo', 'index.json');
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw) as SeoData;
    if (!data || typeof data !== 'object' || !data.pages) {
      cache = null;
      return null;
    }
    cache = data;
    return data;
  } catch {
    cache = null;
    return null;
  }
}

/** Retourne les meta SEO de la page a ce path, ou null si absente. */
export function getPageSeo(routePath: string): PageSeo | null {
  const seo = loadSeo();
  if (!seo) return null;
  const normalized = routePath === '/' ? '/' : routePath.replace(/\/$/, '');
  return seo.pages[normalized] || null;
}

/** Retourne la config globale SEO, ou null. */
export function getSeoGlobal(): SeoGlobal | null {
  const seo = loadSeo();
  return seo?.global || null;
}
