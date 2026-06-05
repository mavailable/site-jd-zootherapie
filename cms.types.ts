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

export interface CmsFieldDatetime {
  type: 'datetime';
  label: string;
  description?: string;
  required?: boolean;
}

export interface CmsFieldBoolean {
  type: 'boolean';
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: boolean;
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
  | CmsFieldDatetime
  | CmsFieldBoolean
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

// Métadonnées enrichies de la liste d'une collection (opt-in, ex: blog).
// Ajouté 2026-06-05 — affichage par ligne dans CollectionList (date, mots, photos, etc.).
// Si absent, CollectionList rend la liste simple historique (zéro régression faq/reviews/services).
export interface CmsListMeta {
  date?: boolean; // date de publication formatée
  words?: boolean; // nb de mots du champ richtext
  photos?: boolean; // hero (image) + <img> inline
  readingTime?: boolean; // temps de lecture estimé
  state?: boolean; // badge Brouillon/Programmé/Publié
  category?: boolean; // catégorie/tag
  views?: boolean; // vues Umami via /metrics (nécessite site.umamiSiteId)
  bodyField?: string; // nom du champ richtext source pour mots/photos (défaut: 'body')
  blogBasePath?: string; // préfixe d'URL pour le matching Umami (défaut: '/blog/')
  categoryField?: string; // nom du champ catégorie (défaut: 'category')
}

export interface CmsCollection {
  label: string;
  description?: string;
  path: string; // ex: "src/content/services"
  slugField: string;
  labelField?: string; // champ à afficher dans la liste (sinon slugField)
  fields: Record<string, CmsField>;
  listMeta?: CmsListMeta; // opt-in : enrichit la liste (tri chrono + métadonnées). Voir CmsListMeta.
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
}

export interface CmsVocauxConfig {
  enabled: boolean;
  hint?: string; // ex: "Décris ton idée d'article, Marc écrira l'article"
}

export interface CmsConfig {
  repo: string; // ex: "marcmuller/site-jd-zootherapie"
  branch: string; // ex: "master"
  siteName: string; // nom du site affiché dans l'admin
  locale?: 'fr' | 'en'; // langue de l'interface /admin (défaut: 'fr')
  singletons: Record<string, CmsSingleton>;
  collections: Record<string, CmsCollection>;
  site?: CmsSiteConfig;
  marketing?: CmsMarketingConfig; // Activé par mkt-social-plan (optionnel)
  vocaux?: CmsVocauxConfig; // Activé par site (pilote jd-zoo 2026-05). VocalRecorder dans /admin.
}
