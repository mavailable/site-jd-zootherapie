import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://jdzootherapeute.fr',
  output: 'static',
  integrations: [
    sitemap({
      // Les LP indexables doivent etre listees ici explicitement (cf. content/landing-pages/*.json, indexable:true).
      // Les autres LP (noindex) sont exclues du sitemap pour eviter tout signal contradictoire.
      filter: (page) => {
        if (page.includes('/lp/')) {
          const indexableLpSlugs = [
            'mediation-animale-alzheimer-domicile',
            'mediation-animale-enfant-emotions',
            'mediation-animale-structures-medico-sociales',
          ];
          return indexableLpSlugs.some((slug) => page.includes(`/lp/${slug}`));
        }
        return (
          !page.includes('/merci') &&
          !page.includes('/404') &&
          !page.includes('/aide-') &&
          !page.includes('/admin')
        );
      },
      i18n: {
        defaultLocale: 'fr',
        locales: { fr: 'fr-FR' },
      },
    }),
    react(),
  ],
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
    build: { cssMinify: true },
  },
});
