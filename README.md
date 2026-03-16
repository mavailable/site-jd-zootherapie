# JD Zoothérapie — Site web

Site vitrine one-page pour Jennifer De Groeve, praticienne certifiée en médiation animale à Vigny (57420), Moselle.

## Stack technique

- **Astro 5.7** — Générateur de site statique
- **Tailwind CSS v4** — Framework CSS utilitaire
- **TypeScript** — Typage strict
- **Web3Forms** — Formulaire de contact
- **Cloudflare Pages** — Hébergement

## Démarrage rapide

```bash
cd site/
npm install
npm run dev      # → http://localhost:4321
npm run build    # → Génère le site dans dist/
npm run preview  # → Prévisualise le build
```

## Avant le premier build

1. **Polices** : Télécharger Lora et DM Sans (voir `public/fonts/DOWNLOAD-FONTS.md`)
2. **Photos** : Ajouter les photos du client dans `public/images/`
3. **Web3Forms** : Remplacer `YOUR_WEB3FORMS_KEY` dans `src/components/sections/Contact.astro`
4. **Cloudflare Analytics** : Décommenter le script dans `src/layouts/BaseLayout.astro` et ajouter le token

## Déploiement Cloudflare Pages

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin git@github.com:marcmuller/jd-zootherapie.git
git push -u origin main
```

Puis sur Cloudflare Pages :
- Framework : Astro
- Build command : `npm run build`
- Output directory : `dist`
- Node version : 22

## Structure du projet

```
site/
├── public/
│   ├── fonts/          ← Polices locales (Lora + DM Sans)
│   ├── images/         ← Photos du client
│   ├── favicon.svg
│   ├── robots.txt
│   └── llms.txt
├── src/
│   ├── components/
│   │   ├── layout/     ← Header, Footer
│   │   ├── sections/   ← Hero, Services, About, FAQ, Contact...
│   │   └── ui/         ← Button, StickyMobileCTA
│   ├── data/
│   │   └── business.ts ← Données centralisées
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── mentions-legales.astro
│   │   ├── politique-confidentialite.astro
│   │   ├── merci.astro
│   │   └── 404.astro
│   └── styles/
│       └── global.css  ← Tokens Tailwind v4
├── astro.config.mjs
├── package.json
└── tsconfig.json
```
