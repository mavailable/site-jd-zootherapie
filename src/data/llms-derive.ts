// Sections DERIVEES des fichiers llms (llms.txt, llms-full.txt), lues au build.
//
// Doctrine wf-04 §9 (decision Marc 28/09/2026, handoffs #195 / #199) : ces deux
// fichiers etaient statiques dans public/, ecrits une fois a la livraison. Ils
// ont derive du site (audit parc du 17/08 : 12 sites sur 13 perimes). Tout ce
// qui existe dans src/content/ (pages, coordonnees, services, FAQ) est donc lu
// ici a chaque build ; seul le texte editorial vit dans llms-preamble.ts.
// Aucune valeur du contenu ne doit etre recopiee dans ce fichier.

import seo from '../content/seo/index.json';
// URL canonique du site : astro.config.mjs -> site (import.meta.env.SITE).

const SITE = String(import.meta.env.SITE).replace(/\/$/, '');

/** URL canonique : slash final (trailingSlash 'always'), jamais une URL qui redirige. */
export function url(path: string): string {
  const [p, hash = ''] = path.split('#');
  const clean = p.replace(/^\/+|\/+$/g, '');
  return `${SITE}/${clean ? `${clean}/` : ''}${hash ? `#${hash}` : ''}`;
}

const ENTITES: Record<string, string> = {
  nbsp: ' ', amp: '&', quot: '"', apos: "'", laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘',
  ldquo: '“', rdquo: '”', hellip: '…', ndash: '–', mdash: '—', eacute: 'é', egrave: 'è', agrave: 'à',
};

/** Texte brut : HTML retire (blocs = saut de paragraphe), entites decodees, pas de tiret cadratin. */
export function plain(s: string | undefined): string {
  return (s ?? '')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|ul|ol)>|<br\s*\/?>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&([a-z]+);/gi, (m, e) => ENTITES[e.toLowerCase()] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/(\d{4})\s*—\s*/g, '$1 - ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Resume coupe sur un mot entier. */
export function oneLine(s: string | undefined, max = 200): string {
  const c = plain(s).replace(/\s+/g, ' ');
  return c.length <= max ? c : `${c.slice(0, max).replace(/\s+\S*$/, '')}...`;
}

/** Libelle court d'une page : le titre SEO sans le nom du site. */
function label(title: string): string {
  return title.split(/\s+[—|·]\s+/)[0].trim();
}

const EXCLUS = /^\/(404|merci|admin|aide|depot|private)(\/|$)/;

/**
 * Pages publiques du site : registre SEO (src/content/seo), hors noindex et exclusions.
 * `prefix` restreint a une langue (ex. '/fr'), `home` libelle la racine de ce prefixe.
 */
export function pagesPrincipales(opts: { prefix?: string; home?: string } = {}): string {
  const prefix = (opts.prefix ?? '').replace(/\/+$/, '');
  const home = opts.home ?? 'Accueil';
  const pages = (seo as { pages: Record<string, { title: string; description: string; noindex?: boolean }> }).pages;
  const norm = (p: string) => `/${p.replace(/^\/+|\/+$/g, '')}`.replace(/\/$/, '') || '/';
  return Object.entries(pages)
    .filter(([path, p]) => !p.noindex && !EXCLUS.test(norm(path).replace(/^\/[a-z]{2}(?=\/|$)/, '')) && norm(path) !== '/404')
    .filter(([path]) => !prefix || norm(path) === prefix || norm(path).startsWith(`${prefix}/`))
    .map(([path, p]) => {
      const root = norm(path) === (prefix || '/');
      return `- [${root ? home : plain(label(p.title))}](${url(path)}): ${oneLine(p.description)}`;
    })
    .join('\n');
}
