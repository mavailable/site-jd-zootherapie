import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://jd-zootherapie.fr',
  output: 'static',
  integrations: [
    sitemap({ i18n: { defaultLocale: 'fr', locales: { fr: 'fr-FR' } } }),
  ],
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    build: { cssMinify: true },
  },
});
