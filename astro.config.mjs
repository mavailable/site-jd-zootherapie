import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const isKeystatic = process.env.KEYSTATIC === 'true';

const keystatic = isKeystatic ? (await import('@keystatic/astro')).default : null;
const react = isKeystatic ? (await import('@astrojs/react')).default : null;
const cloudflare = isKeystatic ? (await import('@astrojs/cloudflare')).default : null;

export default defineConfig({
  site: 'https://jd-zootherapie.fr',
  output: isKeystatic ? 'server' : 'static',
  adapter: isKeystatic && cloudflare ? cloudflare() : undefined,
  integrations: [
    sitemap({ i18n: { defaultLocale: 'fr', locales: { fr: 'fr-FR' } } }),
    ...(isKeystatic && react ? [react()] : []),
    ...(isKeystatic && keystatic ? [keystatic()] : []),
  ],
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    build: { cssMinify: true },
  },
});
