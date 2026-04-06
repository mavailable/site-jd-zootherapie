/**
 * Content helpers — reads CMS JSON flat files via Astro Content API
 */
import { getCollection, getEntry } from 'astro:content';

export async function getSiteInfo() {
  const entry = await getEntry('site-info', 'index');
  return entry!.data;
}

export async function getHero() {
  const entry = await getEntry('hero', 'index');
  return entry!.data;
}

export async function getAbout() {
  const entry = await getEntry('about', 'index');
  return entry!.data;
}

export async function getContact() {
  const entry = await getEntry('contact', 'index');
  return entry!.data;
}

export async function getServices() {
  const entries = await getCollection('services');
  return entries.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)).map(e => e.data);
}

export async function getTestimonials() {
  const entries = await getCollection('testimonials');
  return entries.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)).map(e => e.data);
}

export async function getFaq() {
  const entries = await getCollection('faq');
  return entries.sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0)).map(e => e.data);
}
