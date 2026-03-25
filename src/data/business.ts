/**
 * business.ts
 *
 * Données TECHNIQUES uniquement — non éditables par le client.
 * Le contenu éditorial (nom, phone, email, adresse…) est dans src/content/site-info/index.json
 * et lu via content.ts → getSiteInfo().
 */

// Données légales
export const legal = {
  siret: '947 868 576 00010',
  tvaExempt: true, // Micro-entreprise, article 293 B du CGI
} as const;

// Coordonnées GPS (pour Schema.org) — Verny 57420
export const geo = {
  latitude: 49.0208014,
  longitude: 6.7659488,
} as const;

// URL de production
export const siteUrl = 'https://jdzootherapeute.fr';
