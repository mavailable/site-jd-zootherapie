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

// ============================================================
// Business metadata — fallbacks immuables (doctrine wf-00-cms §7, C1 SEO)
// ============================================================

export const business = {
  owner: 'Jennifer De Groeve',
  alternateName: "Patt'es Tendres",
  schemaType: 'ProfessionalService',
  // Doctrine C1 — source verifiable (Google Maps link dans sameAs)
  rating: {
    value: '5.0',
    count: 9,
    platform: 'Google',
  },
} as const;

// ============================================================
// Data SEO technique (non editable par le client — doctrine wf-00-cms §7)
// ============================================================

export const schemaData = {
  description:
    "Jennifer De Groeve, zoothérapeute certifiée en Moselle. Séances de médiation animale à domicile et en structure pour enfants, adultes et personnes âgées.",
  websiteDescription:
    "Zoothérapeute certifiée en Moselle. Séances de médiation animale à domicile et en structure.",
  telephone: '+33754812122',
  email: 'degroeve.j@gmail.com',
  image: 'https://jdzootherapeute.fr/images/og-default.jpg',
  logo: 'https://jdzootherapeute.fr/favicon.svg',
  address: {
    streetAddress: '17 rue Principale',
    addressLocality: 'Vigny',
    postalCode: '57420',
    addressRegion: 'Grand Est',
    addressCountry: 'FR',
  },
  areaServed: [
    {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 49.0208014,
        longitude: 6.7659488,
      },
      geoRadius: '15000',
    },
    { '@type': 'City', name: 'Metz' },
    { '@type': 'City', name: 'Nancy' },
  ],
  priceRange: '60€',
  currenciesAccepted: 'EUR',
  // Person (founder)
  founderJobTitle: 'Praticienne certifiée en médiation animale',
  founderDescription:
    "Aide-soignante diplômée avec plus de 20 ans d'expérience, formée à l'Institut de Formation en Zoothérapie (IFZ).",
  founderKnowsAbout: [
    'Zoothérapie',
    'Médiation animale',
    'Maladies neurodégénératives',
    'Accompagnement enfants',
    'Accompagnement personnes âgées',
  ],
  memberOfName: 'Syndicat Français des Zoothérapeutes',
  sameAs: [
    'https://www.facebook.com/profile.php?id=61573108913954',
    'https://www.instagram.com/jenniferzootherapeute',
    'https://www.google.com/maps/place/De+Groeve+Jennifer+zootherapie+-+m%C3%A8diation+animale/@49.0208014,6.7659488,17z',
  ],
} as const;

// Web3Forms API key — cascade: CMS content → env var → cle Marc (defaut agence)
const WEB3FORMS_DEFAULT = '9667fcf8-c7da-4b7a-8432-0ec25215c75e';
export const web3formsDefault = WEB3FORMS_DEFAULT;
export const web3formsKey = import.meta.env.WEB3FORMS_KEY || WEB3FORMS_DEFAULT;

// ============================================================
// Google Ads — feature flag + conversion tracking
// ============================================================
// Tant que ads.enabled = false, aucun script Ads ni banniere cookies n'est
// injecte (doctrine WF "sans bandeau" preservee).
// Quand on bascule ads.enabled = true, il faut aussi remplir conversionId
// ('AW-XXXXXXXXX') recupere depuis l'UI Ads client (Tools > Conversions > Tag).
export const ads = {
  enabled: true,
  conversionId: 'G-J8SY9MTLG4' as string | null, // GA4 measurement ID (analytics)
  adsConversionId: 'AW-17890952261' as string | null, // Google Ads conversion ID (requis pour que les AW-XXX/LABEL fire)
} as const;
