/**
 * content.ts — Helpers de lecture du contenu Keystatic
 * Lit les fichiers JSON dans src/content/ et retourne des objets typés
 */

import fs from 'node:fs';
import path from 'node:path';

function readJson<T>(filePath: string): T {
  const fullPath = path.join(process.cwd(), filePath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as T;
}

function readCollection<T>(dirPath: string): T[] {
  const fullDir = path.join(process.cwd(), dirPath);
  if (!fs.existsSync(fullDir)) return [];
  return fs.readdirSync(fullDir)
    .filter(f => f.endsWith('.json'))
    .map(f => readJson<T>(path.join(dirPath, f)));
}

// Types

export interface SiteInfo {
  name: string;
  alternateName: string;
  tagline: string;
  phone: string;
  phoneDisplay: string;
  email: string;
  address: { street: string; city: string; postalCode: string; region: string; country: string };
  areaServed: string;
  lang: string;
  social: { instagram: string; facebook: string; googleBusiness: string };
  affiliations: string[];
  seo: { defaultTitle: string; defaultDescription: string; ogImage: string };
}

export interface HeroContent {
  h1: string;
  subtitle: string;
  ctaPrimaryText: string;
  ctaPrimaryHref: string;
  ctaSecondaryText: string;
  ctaSecondaryHref: string;
  reassurance: string;
}

export interface AboutContent {
  founderName: string;
  founderTitle: string;
  paragraphs: string[];
  animals: Array<{ name: string; breed: string; role: string }>;
}

export interface Service {
  slug: string;
  title: string;
  audience: string;
  description: string;
  price?: string;
  order: number;
}

export interface Testimonial {
  slug: string;
  author: string;
  context: string;
  quote: string;
  order: number;
}

export interface FaqItem {
  slug: string;
  question: string;
  answer: string;
  order: number;
}

export interface ContactContent {
  title: string;
  subtitle: string;
  buttonText: string;
  rgpdText: string;
}

// Helpers

export function getSiteInfo(): SiteInfo {
  return readJson<SiteInfo>('src/content/site-info/index.json');
}

export function getHero(): HeroContent {
  return readJson<HeroContent>('src/content/hero/index.json');
}

export function getAbout(): AboutContent {
  return readJson<AboutContent>('src/content/about/index.json');
}

export function getContact(): ContactContent {
  return readJson<ContactContent>('src/content/contact/index.json');
}

export function getServices(): Service[] {
  return readCollection<Service>('src/content/services').sort((a, b) => a.order - b.order);
}

export function getTestimonials(): Testimonial[] {
  return readCollection<Testimonial>('src/content/testimonials').sort((a, b) => a.order - b.order);
}

export function getFaq(): FaqItem[] {
  return readCollection<FaqItem>('src/content/faq').sort((a, b) => a.order - b.order);
}
