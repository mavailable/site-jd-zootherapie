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
  `connect-src 'self' ${UMAMI} ${UMAMI_GW} ${GTM} https://*.google-analytics.com https://*.analytics.google.com https://*.g.doubleclick.net https://ad.doubleclick.net https://pagead2.googlesyndication.com https://www.googleadservices.com ${GOOGLE_PAYS}`,
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
