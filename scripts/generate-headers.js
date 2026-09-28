#!/usr/bin/env node
/**
 * Post-build : ecrit dist/_headers (en-tetes de securite + Content Security Policy).
 *
 * La CSP publique n'utilise NI 'unsafe-inline' NI 'unsafe-eval' pour les scripts :
 * chaque script ecrit dans la page (banniere de consentement, chargeurs de tags,
 * menu mobile, calculateur, suivi des pages /lp/, formulaire) est autorise par son
 * empreinte SHA-256, recalculee a chaque build.
 *
 * PIEGE (incident marcm, suivi Umami casse 5 semaines) : l'empreinte porte sur les
 * octets EXACTS entre <script> et </script>, sans trim. Astro conserve l'indentation
 * d'un <script is:inline> multi-lignes ; trimmer produit une empreinte qui ne matche
 * pas et le script est bloque.
 *
 * Les blocs JSON-LD (type="application/ld+json") ne sont pas des scripts executables
 * et ne sont pas hashes ; la passe d'observation a confirme qu'ils ne declenchent
 * aucune violation.
 *
 * Mecanisme : fichier _headers statique (et non une Pages Function). jd-zoo n'a de
 * Functions que sur /api/* et /img/* : router tout le HTML a travers un middleware
 * couterait un appel de Worker par page. La valeur tient sous la limite de 2000
 * caracteres par en-tete de _headers (verifiee ci-dessous, le build echoue sinon).
 */
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';
/** Passe 1 = true (observation). Passe 2 = false : la CSP est appliquee.
 *  Passe d'observation du 12/09 : 0 violation sur accueil, /lp/, article de blog,
 *  contact, pages legales, tarifs, depot, merci, /admin et l'edition inline ouverte,
 *  ainsi que sur les 3 parcours de consentement. */
const REPORT_ONLY = false;
const LIMITE_HEADERS = 2000;

function htmlFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return htmlFiles(p);
    return e.name.endsWith('.html') ? [p] : [];
  });
}

function hashesInlineScripts() {
  const set = new Set();
  for (const f of htmlFiles(DIST)) {
    const html = readFileSync(f, 'utf8');
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = m[1] || '';
      const body = m[2];
      if (/\bsrc\s*=/.test(attrs)) continue;
      if (/application\/ld\+json/i.test(attrs)) continue;
      if (!body.trim()) continue;
      set.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
    }
  }
  return [...set].sort();
}

const hashes = hashesInlineScripts();

// Origines Google reellement observees au chargement des pages (passe d'observation
// du 12/09) : googletagmanager sert gtag.js et le second script Ads ; les points de
// collecte GA4 et Ads sont en connect-src ; googleadservices et doubleclick servent
// les scripts et pixels de conversion.
const GTM = 'https://www.googletagmanager.com';
const UMAMI = 'https://cloud.umami.is';
const UMAMI_GW = 'https://gateway.umami.is';
// Domaines Google par pays : la doc Google ecrit « https://www.google.<TLD> » sans les
// enumerer. Le site vise la Moselle et la Meurthe-et-Moselle, d'ou .fr, .com et les
// voisins frontaliers. Un visiteur dont le domaine Google est autre (google.es...) verra
// seulement le ping d'audience Ads bloque : ni le site ni la mesure GA4 n'en dependent.
// API geographiques du calculateur de tarif (TarifCalculator.astro) : geocodage
// Nominatim puis distance routiere OSRM, appelees depuis le navigateur. Absentes de
// connect-src du 12/09 au 28/09 : calculateur casse (« Erreur de calcul ») sans
// que le build ne dise rien, d'ou le controle verifierOriginesScripts() plus bas.
const GEO_APIS = 'https://nominatim.openstreetmap.org https://router.project-osrm.org';
const GOOGLE_PAYS = ['https://www.google.com', 'https://google.com', 'https://www.google.fr', 'https://www.google.be', 'https://www.google.ch', 'https://www.google.de', 'https://www.google.lu'].join(' ');

const cspPublique = [
  "default-src 'self'",
  // script-src : origines documentees par Google pour gtag, GA4 et le suivi de conversion
  // Ads (developers.google.com/tag-platform/security/guides/csp), plus Umami.
  `script-src 'self' ${hashes.join(' ')} ${GTM} ${UMAMI} https://www.googleadservices.com https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://www.google.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "media-src 'self' blob:",
  // analytics.google.com (apex) : gtag GA4 y poste des que analytics_storage est
  // accorde ; le joker *.analytics.google.com ne couvre pas l apex (releve 23/09).
  `connect-src 'self' ${UMAMI} ${UMAMI_GW} ${GTM} https://*.google-analytics.com https://*.analytics.google.com https://analytics.google.com https://*.g.doubleclick.net https://ad.doubleclick.net https://pagead2.googlesyndication.com https://www.googleadservices.com ${GEO_APIS} ${GOOGLE_PAYS}`,
  'frame-src https://td.doubleclick.net https://www.googletagmanager.com',
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

// /admin : ilot React du moteur (CmsApp), editeur richtext et tableau Umami en iframe.
// 'unsafe-inline' et 'unsafe-eval' y restent necessaires (code du moteur, pas du site).
const cspAdmin = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self'",
  `connect-src 'self' https://api.github.com https://umami-proxy.marc-f10.workers.dev ${UMAMI} ${UMAMI_GW}`,
  `frame-src 'self' ${UMAMI}`,
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
].join('; ');

// Garde-fou : toute origine externe ecrite dans un script des pages publiques (inline
// ou chunk /_astro/ charge par ces pages) doit etre autorisee par connect-src ou
// script-src. Sinon le build echoue : c'est ainsi qu'une fonctionnalite qui appelle
// une API tierce ne peut plus etre cassee en silence par la CSP. La passe
// d'observation ne suffit pas : elle ne voit que les appels declenches au chargement,
// pas ceux declenches par une action du visiteur (saisie dans le calculateur).
// Origines citees dans le code sans etre jamais appelees (espaces de noms SVG...) :
const ORIGINES_NON_RESEAU = new Set(['http://www.w3.org']);

function directive(csp, nom) {
  const d = csp.split(';').map((x) => x.trim()).find((x) => x.startsWith(nom + ' '));
  return d ? d.split(/\s+/).slice(1) : [];
}

function couverte(origine, sources) {
  const hote = origine.replace(/^https?:\/\//, '');
  return sources.some((src) => {
    if (!/^https?:\/\//.test(src)) return false;
    const h = src.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (h.startsWith('*.')) return hote.endsWith(h.slice(1));
    return h === hote && src.startsWith(origine.split('//')[0]);
  });
}

function verifierOriginesScripts(csp) {
  const sources = [...directive(csp, 'connect-src'), ...directive(csp, 'script-src')];
  const trouvees = new Map();
  const chunks = new Set();
  const noter = (texte, fichier) => {
    for (const [o] of texte.matchAll(/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/gi)) {
      if (!trouvees.has(o)) trouvees.set(o, fichier);
    }
  };
  for (const f of htmlFiles(DIST)) {
    if (f.startsWith(join(DIST, 'admin'))) continue;
    const html = readFileSync(f, 'utf8');
    const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
      const attrs = m[1] || '';
      const src = attrs.match(/\bsrc\s*=\s*["']([^"']+)["']/);
      if (src) { if (src[1].startsWith('/')) chunks.add(join(DIST, src[1])); continue; }
      if (/application\/ld\+json/i.test(attrs)) continue;
      noter(m[2], f);
    }
  }
  for (const c of chunks) noter(readFileSync(c, 'utf8'), c);
  const manquantes = [...trouvees].filter(([o]) => !ORIGINES_NON_RESEAU.has(o) && !couverte(o, sources));
  if (manquantes.length) {
    for (const [o, f] of manquantes) console.error(`[headers] ${o} (cite dans ${f}) n'est autorisee ni par connect-src ni par script-src : le navigateur bloquera l'appel.`);
    console.error("[headers] ajouter l'origine a la CSP publique, ou a ORIGINES_NON_RESEAU si elle n'est jamais appelee.");
    process.exit(1);
  }
  console.log(`[headers] ${trouvees.size} origines externes citees par les scripts publics, toutes couvertes par la CSP.`);
}

verifierOriginesScripts(cspPublique);

const cle = REPORT_ONLY ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';

for (const [nom, valeur] of [['publique', cspPublique], ['admin', cspAdmin]]) {
  if (valeur.length > LIMITE_HEADERS) {
    console.error(`[headers] CSP ${nom} : ${valeur.length} caracteres, au-dela de la limite de ${LIMITE_HEADERS} d'un en-tete _headers.`);
    console.error('[headers] passer au mecanisme middleware (cf. projets/marcm/functions/_middleware.js).');
    process.exit(1);
  }
}

const contenu = `# Genere par scripts/generate-headers.js au build. Ne pas editer a la main.
# CSP par empreintes SHA-256 des scripts inline (${hashes.length} empreintes), sans unsafe-inline cote script.
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Strict-Transport-Security: max-age=63072000; includeSubDomains
  Permissions-Policy: camera=(), microphone=(self), geolocation=(), payment=()
  X-XSS-Protection: 0
  ${cle}: ${cspPublique}

/admin
  ! ${cle}
  X-Robots-Tag: noindex, nofollow
  ${cle}: ${cspAdmin}

/admin/*
  ! ${cle}
  X-Robots-Tag: noindex, nofollow
  ${cle}: ${cspAdmin}

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/favicon.svg
  Cache-Control: public, max-age=86400
`;

writeFileSync(join(DIST, '_headers'), contenu);
console.log(`[headers] dist/_headers ecrit : ${hashes.length} empreintes, CSP publique ${cspPublique.length} car., CSP admin ${cspAdmin.length} car., mode ${REPORT_ONLY ? 'observation (Report-Only)' : 'bloquant'}.`);
