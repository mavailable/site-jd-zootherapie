// Helpers purs pour BlogTab v3 — state article, slug, dates

export type ArticleState = 'draft' | 'scheduled' | 'published';

export interface ArticleData {
  title?: string;
  date?: string;
  category?: string;
  draft?: boolean;
  publish_at?: string;
}

export interface ArticleEntry {
  name: string;
  slug: string;
  state: ArticleState;
  data: ArticleData;
  sha?: string;
}

export interface BlogIdea {
  title: string;
  source?: string;
  notes?: string;
  status?: 'a-faire' | 'brouillon' | 'publie' | 'archive' | string;
  slug?: string;
  updated_at?: string;
}

export interface BlogIdeasFile {
  ideas: BlogIdea[];
}

export function articleState(data: ArticleData, now: Date = new Date()): ArticleState {
  if (data.draft === true) return 'draft';
  if (data.publish_at) {
    const t = new Date(data.publish_at).getTime();
    if (!Number.isNaN(t) && t > now.getTime()) return 'scheduled';
  }
  return 'published';
}

export function slugFromFilename(name: string): string {
  return name.replace(/\.json$/, '');
}

// ── Métadonnées liste d'articles (calcul côté client à partir du body déjà chargé) ──

// Décode les entités HTML les plus courantes (le body est du HTML string TipTap).
function decodeBasicEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');
}

/**
 * Compte les mots d'un champ richtext (HTML string).
 * Strip des balises + décode entités basiques + split sur whitespace.
 */
export function countWords(body?: unknown): number {
  if (typeof body !== 'string' || !body) return 0;
  const text = decodeBasicEntities(body.replace(/<[^>]+>/g, ' '));
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Compte les photos d'un article : hero (data.image non vide) + <img> inline dans le body.
 * Marche que les images soient en /images/...webp (jd-zoo) ou via R2 /img/... (galgoessolo/zompa).
 */
export function countPhotos(data: { image?: unknown }, body?: unknown): number {
  const hero = typeof data.image === 'string' && data.image.trim() ? 1 : 0;
  const inline = typeof body === 'string' ? (body.match(/<img\b/gi) || []).length : 0;
  return hero + inline;
}

/** Temps de lecture en minutes (≈200 mots/min), minimum 1. */
export function readingTime(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/**
 * Timestamp de tri chronologique d'un article : publish_at (programmé) prioritaire sur date.
 * Permet de faire remonter les articles programmés futurs en tête. NaN → 0 (relégué en bas).
 */
export function sortTimestamp(data: { publish_at?: unknown; date?: unknown }): number {
  const raw = (typeof data.publish_at === 'string' && data.publish_at) ||
    (typeof data.date === 'string' && data.date) || '';
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

export function formatDateFr(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

export function formatDateTimeFr(iso?: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// Arrondit à la prochaine demi-heure et retourne au format datetime-local (YYYY-MM-DDTHH:mm).
export function defaultPickerValue(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 60 * 60 * 1000); // +1h
  const minutes = d.getMinutes();
  if (minutes < 30) d.setMinutes(30, 0, 0);
  else {
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Convertit une valeur datetime-local (locale) en ISO avec offset.
export function pickerValueToIso(local: string): string {
  const d = new Date(local);
  return d.toISOString();
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}

export function pickerMin(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 30 * 60 * 1000); // au minimum dans 30 min
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
