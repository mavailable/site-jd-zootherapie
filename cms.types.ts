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
  | CmsFieldImage
  | CmsFieldObject
  | CmsFieldArray;

export interface CmsSingleton {
  label: string;
  description?: string;
  path: string; // ex: "src/content/hero/index.json"
  fields: Record<string, CmsField>;
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

export interface CmsConfig {
  repo: string; // ex: "marcmuller/site-jd-zootherapie"
  branch: string; // ex: "master"
  siteName: string; // nom du site affiché dans l'admin
  singletons: Record<string, CmsSingleton>;
  collections: Record<string, CmsCollection>;
  site?: CmsSiteConfig;
}
