// Types du CMS custom — Web Factory
// Structure JSON-serializable (pas de callbacks)

export interface CmsFieldText {
  type: 'text';
  label: string;
  description?: string;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
}

export interface CmsFieldRichText {
  type: 'richtext';
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
}

export interface CmsFieldNumber {
  type: 'number';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: number;
}

export interface CmsFieldDate {
  type: 'date';
  label: string;
  description?: string;
  required?: boolean;
}

export interface CmsFieldSelect {
  type: 'select';
  label: string;
  description?: string;
  required?: boolean;
  options: Array<{ label: string; value: string }>;
  defaultValue?: string;
}

export interface CmsFieldMultiselect {
  type: 'multiselect';
  label: string;
  description?: string;
  required?: boolean;
  options: Array<{ label: string; value: string }>;
  minItems?: number;
  maxItems?: number;
}

export interface CmsFieldImage {
  type: 'image';
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
}

export interface CmsFieldObject {
  type: 'object';
  label: string;
  fields: Record<string, CmsField>;
}

export interface CmsFieldArray {
  type: 'array';
  label: string;
  itemLabel?: string; // clé du champ à utiliser comme label d'affichage
  item: CmsFieldObject | CmsFieldText | CmsFieldImage;
}

export type CmsField =
  | CmsFieldText
  | CmsFieldRichText
  | CmsFieldNumber
  | CmsFieldDate
  | CmsFieldSelect
  | CmsFieldMultiselect
  | CmsFieldImage
  | CmsFieldObject
  | CmsFieldArray;

// Groupes fonctionnels du dashboard (HomeScreen)
// Rétrocompat : un singleton sans `group` tombe dans "reglages" (non régression parc CMS)
export type CmsSingletonGroup = 'accueil' | 'a-propos' | 'contact' | 'pages' | 'reglages' | 'legal';

export interface CmsSingleton {
  label: string;
  description?: string;
  path: string; // ex: "src/content/hero/index.json"
  fields: Record<string, CmsField>;
  // ─── Dashboard hints (optionnels, rétrocompatibles) ───
  // Ajouté 2026-04-22 — dashboard groupé par contexte d'usage.
  group?: CmsSingletonGroup; // fallback silencieux sur 'reglages' si absent
  dashboardPriority?: number; // 1 = prominent en haut du groupe, 99 = relégué. Défaut : 50
  dashboardIcon?: string; // emoji, remplace le fallback interne (singletonIcon)
}

export interface CmsCollection {
  label: string;
  description?: string;
  path: string; // ex: "src/content/services"
  slugField: string;
  labelField?: string; // champ à afficher dans la liste (sinon slugField)
  fields: Record<string, CmsField>;
}

export interface CmsSiteConfig {
  ownerName?: string;
  tagline?: string;
  phone?: string;
  phoneDisplay?: string;
  email?: string;
  siteUrl?: string;
  previewUrl?: string;
  gbpUrl?: string;
  reviewUrl?: string;
  facebookUrl?: string;
  linkedinUrl?: string;
  calUrl?: string;
  clientType?: string;
  umamiShareUrl?: string;
  umamiSiteId?: string;
  contactMarc?: {
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
}

export interface CmsMarketingConfig {
  enabled: boolean;
  trimesters?: string[]; // Format : "YYYY-Q1" ... "YYYY-Q4" (ex: ["2026-Q2", "2026-Q3"])
  // Sous-module Carrousels LinkedIn (généré par carousel-studio + mkt-carousel-generate).
  // Activé pour les clients qui ont reçu au moins 1 carrousel généré par Marc.
  carrousels?: {
    enabled: boolean;
  };
}

export interface CmsGbpConfig {
  enabled: boolean;
  // demo   = mock UI sans appel API (screencast whitelist Google)
  // manual = workflow copier-coller (génération auto + publication manuelle dans GBP)
  // live   = publication directe via API GBP (post-whitelist)
  mode?: 'demo' | 'manual' | 'live';
  // URL où le client va pour publier manuellement (mode manual).
  // Default: https://business.google.com/posts
  gbpEditUrl?: string;
  // UTM campaign suffix injecté sur les URLs des CTA (default: blog-{slug})
  utmCampaignPrefix?: string;
  accountId?: string;
  locationId?: string;
}

export interface CmsConfig {
  repo: string; // ex: "marcmuller/site-jd-zootherapie"
  branch: string; // ex: "master"
  siteName: string; // nom du site affiché dans l'admin
  singletons: Record<string, CmsSingleton>;
  collections: Record<string, CmsCollection>;
  site?: CmsSiteConfig;
  marketing?: CmsMarketingConfig; // Activé par mkt-social-plan (optionnel)
  gbp?: CmsGbpConfig; // Activé par mkt-gbp-from-blog (optionnel, demo ou live)
}
