/**
 * business.ts
 *
 * Contient :
 * 1. Les données TECHNIQUES (legal, geo) — non éditables par le client
 * 2. Une ré-exportation de siteInfo pour la compatibilité avec les composants existants
 *    → WF-06 migrera chaque composant vers content.ts directement
 */

import fs from 'node:fs';
import path from 'node:path';

// Données légales (non éditables)
export const legal = {
  siret: '',   // À compléter avant mise en prod
  rcs: '',
  tva: '',
} as const;

// Coordonnées GPS (pour Schema.org)
export const geo = {
  latitude: 49.015,   // Estimé pour Vigny 57420 — à vérifier
  longitude: 6.195,
} as const;

// Domaine
export const siteUrl = 'https://jd-zootherapie.fr';

// ── Compat shim (utilisé par les composants one-page en attendant wf-06) ──────

interface SiteInfo {
  name: string; alternateName: string; tagline: string;
  phone: string; phoneDisplay: string; email: string;
  address: { street: string; city: string; postalCode: string; region: string; country: string };
  areaServed: string;
  social: { instagram: string; facebook: string; googleBusiness: string };
  affiliations: string[];
  animals: Array<{ name: string; breed: string; role?: string; description?: string }>;
  seo: { defaultTitle: string; defaultDescription: string; ogImage: string };
  founder?: string; founderTitle?: string; priceRange?: string;
}

function loadSiteInfo(): SiteInfo {
  const fullPath = path.join(process.cwd(), 'src/content/site-info/index.json');
  const raw = JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as SiteInfo;
  return raw;
}

const _si = loadSiteInfo();

/** @deprecated — Utiliser getSiteInfo() de content.ts. Supprimé en wf-06. */
export const business = {
  clientType: 'freelance-consultant' as const,
  name: _si.name,
  alternateName: _si.alternateName,
  description: _si.seo.defaultDescription,
  tagline: _si.tagline,
  url: siteUrl,
  phone: _si.phone,
  phoneDisplay: _si.phoneDisplay,
  email: _si.email,
  address: _si.address,
  geo,
  founder: 'Jennifer De Groeve',
  founderTitle: 'Praticienne certifiée en médiation animale',
  areaServed: _si.areaServed,
  priceRange: '60€',
  social: _si.social,
  affiliations: _si.affiliations,
  animals: [
    { name: 'Tips', breed: 'Finnois de Laponie', description: "Doux et attentif" },
    { name: 'Uxo', breed: 'Berger américain miniature', description: "Plein d'énergie" },
    { name: 'Tap-Tap', breed: 'Lapin bélier', description: 'Idéal pour les moments de tendresse' },
  ],
  seo: _si.seo,
};
