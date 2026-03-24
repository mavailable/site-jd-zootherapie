/**
 * business.ts
 *
 * Données TECHNIQUES uniquement — non éditables par le client.
 * Le contenu éditorial (nom, phone, email, adresse…) est dans src/content/site-info/index.json
 * et lu via content.ts → getSiteInfo().
 */

// Données légales (à compléter avant mise en prod)
export const legal = {
  siret: '',
  rcs: '',
  tva: '',
} as const;

// Coordonnées GPS (pour Schema.org) — Verny 57420
export const geo = {
  latitude: 49.0208014,
  longitude: 6.7659488,
} as const;

// URL de production
export const siteUrl = 'https://jdzootherapeute.fr';
