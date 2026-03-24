# Audit Discovery — JD Zoothérapie

**Date** : 2026-03-23
**URL** : https://jdzootherapeute.fr
**Projet** : `/sessions/dazzling-wizardly-knuth/mnt/jd-zootherapeute/site`
**Git** : `https://github.com/mavailable/site-jd-zootherapie.git`
**Objectif** : Audit complet avant livraison finale — détecter les problèmes résiduels après la phase de construction

---

## Informations de base

| Donnée | Valeur |
|--------|--------|
| Langue | fr |
| Pays cible | FR |
| Type de client | freelance-consultant (zoothérapeute indépendante) |
| Framework | Astro v5.7.0 |
| CSS | Tailwind CSS v4.0 (via @tailwindcss/vite, sans config file) |
| TypeScript | Oui (strict mode, chemins aliasés @/*) |
| Hébergement | Cloudflare Pages |
| Adapter | @astrojs/cloudflare v12.6 (mode hybride en mode CMS) |
| CMS | Keystatic v0.5 (optionnel, activé via `KEYSTATIC=true`) |
| Build | Vite (compressHTML: true, cssMinify: true) |
| Analytics | Umami (sans cookies) — **ID non configuré** |
| Output | static (prod) / hybrid (avec CMS) |

---

## Structure du projet

### Pages (12 routes)

| Route | Fichier | H1 (titre) | Meta description |
|-------|---------|------------|-----------------|
| `/` | index.astro | "JD Zoothérapie — Médiation animale en Moselle \| Jennifer De Groeve" | ✅ Oui |
| `/zootherapie` | zootherapie.astro | "La médiation animale — Bienfaits et publics \| JD Zoothérapie" | ✅ Oui |
| `/ateliers` | ateliers.astro | "Ateliers de médiation animale en Moselle \| JD Zoothérapie" | ✅ Oui |
| `/a-propos` | a-propos.astro | "Jennifer De Groeve — Praticienne en médiation animale, Moselle" | ✅ Oui |
| `/tarifs` | tarifs.astro | "Tarifs de médiation animale — Transparence et accompagnement sur mesure" | ✅ Oui |
| `/temoignages` | temoignages.astro | "Témoignages — Familles et structures en Moselle \| JD Zoothérapie" | ✅ Oui |
| `/faq` | faq.astro | "FAQ — Questions sur la zoothérapie \| JD Zoothérapie" | ✅ Oui |
| `/contact` | contact.astro | "Contact — JD Zoothérapie \| Jennifer De Groeve, Verny Moselle" | ✅ Oui |
| `/mentions-legales` | mentions-legales.astro | — | ✅ Oui |
| `/politique-confidentialite` | politique-confidentialite.astro | — | ✅ Oui |
| `/merci` | merci.astro | — | ✅ Oui (noindex) |
| `/404` | 404.astro | — | ✅ Oui |

### Composants (15)

| Composant | Fichier | Utilisé dans |
|-----------|---------|-------------|
| Header | layout/Header.astro | Toutes les pages |
| Footer | layout/Footer.astro | Toutes les pages |
| Hero | sections/Hero.astro | index |
| SocialProof | sections/SocialProof.astro | index |
| About | sections/About.astro | index, a-propos |
| Services | sections/Services.astro | ateliers |
| PhotoGallery | sections/PhotoGallery.astro | index |
| FAQ | sections/FAQ.astro | index, faq |
| CTABanner | sections/CTABanner.astro | index, tarifs, zootherapie… |
| Contact | sections/Contact.astro | contact |
| TarifCalculator | sections/TarifCalculator.astro | tarifs, contact, index |
| PageHero | sections/PageHero.astro | Pages secondaires |
| Button | ui/Button.astro | — |
| SectionTitle | ui/SectionTitle.astro | — |
| StickyMobileCTA | ui/StickyMobileCTA.astro | Toutes les pages |

### Assets

| Type | Nombre | Taille totale | Notes |
|------|--------|---------------|-------|
| Images JPG/PNG | 19 | 3,5 Mo | Voir détails ci-dessous |
| Polices woff2 | 5 | 100 Ko | ✅ Locales, optimisées |
| favicon.ico | 1 | 913 o | ✅ Multi-résolution (16/32/48px) |
| favicon.svg | 1 | 511 o | ✅ |
| apple-touch-icon.png | 1 | 47 Ko | ✅ |
| icon-192.png | 1 | 51 Ko | ✅ |
| icon-512.png | 1 | 217 Ko | ✅ |
| OG image | 1 | 113 Ko | ✅ 1200×630 |
| PDF plaquette | 1 | 1,6 Mo | ✅ |
| webmanifest | 1 | — | ✅ |
| robots.txt | 1 | — | ✅ Bots IA autorisés |
| llms.txt | 1 | — | ✅ Contenu riche |
| sitemap | auto | — | ✅ via @astrojs/sitemap |

#### Détail images problématiques

| Fichier | Taille | Problème |
|---------|--------|---------|
| `logo-transparent.png` | 780 Ko | ⚠️ Non utilisé en prod (seul logo-sm.png l'est) — 780 Ko servis inutilement |
| `aussie-carte.jpg` | 150 Ko | ⚠️ Non référencé dans le code — fichier orphelin, nom "aussie" incorrect |
| `favicon-32.png` | 2,8 Ko | ⚠️ Non référencé dans BaseLayout — orphelin |
| `_tmp_32.png` | 528 o | ❌ Fichier temporaire parasite dans `/public/` — sera déployé en prod |
| `session-senior.jpg` | 246 Ko | ⚠️ Pas optimisé en WebP |
| `session-enfants.jpg` | 205 Ko | ⚠️ Pas optimisé en WebP |
| `session-enfant.jpg` | 210 Ko | ⚠️ Pas optimisé en WebP |
| `hero-bg.jpg` | 226 Ko | ⚠️ Image critique (LCP) — pas en WebP |

### Données (content collections)

| Collection | Fichiers | État |
|------------|----------|------|
| site-info | 1 | ✅ |
| hero | 1 | ✅ |
| about | 1 | ✅ |
| services | 6 | ✅ |
| faq | 8 | ✅ |
| testimonials | 3 | ✅ Vrais avis Google |
| contact | 1 | ✅ |

---

## État actuel par domaine

### SEO

| Élément | État | Détail |
|---------|------|--------|
| Meta title | ✅ | Toutes pages |
| Meta description | ✅ | Toutes pages |
| Canonical | ✅ | Dynamique via Astro.url.href |
| Schema ProfessionalService | ✅ | Index : ProfessionalService + AggregateRating (5.0 · 9 avis) |
| Schema FAQPage | ✅ | Page /faq |
| Schema BreadcrumbList | ✅ | Pages secondaires |
| Schema WebSite | ✅ | Index |
| Schema Person | ✅ | Imbriqué dans ProfessionalService |
| aggregateRating | ✅ | 5.0 / 9 avis |
| OG image | ✅ | 1200×630, PIL-généré, logo + photo + étoiles |
| OG tags complets | ✅ | title, desc, image, url, type, locale, site_name |
| Twitter Card | ✅ | summary_large_image |
| sitemap.xml | ✅ | Auto-généré, fr-FR |
| robots.txt | ✅ | Allow: / pour tous bots, bots IA explicitement autorisés |
| llms.txt | ✅ | Contenu riche et détaillé |
| noindex /merci | ✅ | Page de confirmation protégée |

### Design & Accessibilité

| Élément | État | Détail |
|---------|------|--------|
| Viewport meta | ✅ | width=device-width, initial-scale=1.0 |
| Skip-to-content | ✅ | Présent dans BaseLayout |
| Alt-text images | ⚠️ | 2 alt incorrects dans PhotoGallery (voir Majeurs) |
| Polices locales | ✅ | DM Sans + Lora — 5 fichiers woff2 ≥ 14 Ko |
| Preload polices | ✅ | Lora 600 preloadée |
| theme-color | ✅ | #2D4B4E (teal brand) |
| PWA / webmanifest | ✅ | Icônes 192 et 512 |
| Touch targets 44px | ✅ | StickyMobileCTA + boutons principaux |
| Focus visible | ✅ | Classes focus: Tailwind présentes |
| Hero image loading | ✅ | eager + fetchpriority="high" |
| Lazy loading autres | ✅ | loading="lazy" sur images non critiques |

### Legal & RGPD

| Élément | État | Détail |
|---------|------|--------|
| Mentions légales | ✅ | /mentions-legales |
| Politique confidentialité | ✅ | /politique-confidentialite |
| Bannière cookies | ✅ N/A | Umami sans cookies → pas de bannière requise (déclaré dans mentions légales) |
| RGPD mention formulaire | ✅ | Contact.astro + TarifCalculator.astro |
| Page /merci | ✅ | Confirmation après formulaire |
| Page 404 | ✅ | Personnalisée |

### Formulaires

| Élément | État | Détail |
|---------|------|--------|
| Formulaire contact | ✅ | Web3Forms, action POST |
| Access key | ✅ | `aaaaa969-db18-4cb0-99c9-cc9eb258e7b3` |
| Destination email | ⚠️ | Non visible dans le code (géré côté Web3Forms) — à vérifier : doit pointer sur degroeve.j@gmail.com |
| Anti-spam | ✅ | Web3Forms honeypot intégré |
| Formulaire réservation | ✅ | TarifCalculator — 3 étapes + validation JS |
| Page /merci | ✅ | Redirection après envoi |

### Performance

| Élément | État | Détail |
|---------|------|--------|
| Analytics | ❌ | Umami présent mais ID = `VOTRE_UMAMI_WEBSITE_ID` — non fonctionnel |
| HTML compressé | ✅ | compressHTML: true dans astro.config.mjs |
| CSS minifié | ✅ | cssMinify: true |
| Images WebP | ❌ | Toutes en JPG/PNG — pas de conversion WebP |
| Image Astro optimisée | ❌ | Utilise `<img>` natif, pas `<Image />` d'Astro |
| Polices preload | ✅ | Lora 600 preloadée |
| Hero LCP | ✅ | eager + fetchpriority="high" |

### Sécurité & Liens

| Élément | État | Détail |
|---------|------|--------|
| HTTPS | ✅ | (Cloudflare Pages) |
| target="_blank" + noopener | ✅ | Footer, SocialProof, merci — tous avec rel="noopener noreferrer" |
| Backlink | ✅ | marcm.fr avec rel="noopener noreferrer" |

---

## Problèmes détectés

### Critiques (bloquants)

| # | Problème | Localisation | Impact |
|---|---------|-------------|--------|
| C1 | **Analytics non fonctionnel** — `data-website-id="VOTRE_UMAMI_WEBSITE_ID"` | `src/layouts/BaseLayout.astro:131` | Aucun tracking en prod |
| C2 | **Fichier parasite `_tmp_32.png`** (528 o) déployé en prod | `public/_tmp_32.png` | Pollution du build, erreur potentielle |

### Majeurs

| # | Problème | Localisation | Impact |
|---|---------|-------------|--------|
| M1 | **Alt text incorrect** — `hero-bg.jpg` : "Australian Shepherd" au lieu de "Uxo, le Berger américain miniature médiateur" | `src/components/sections/PhotoGallery.astro:12` | SEO, accessibilité |
| M2 | **Alt text incorrect** — `session-cuddle.jpg` : "Australian Shepherd blotti" au lieu de "Uxo le Berger américain miniature blotti" | `src/components/sections/PhotoGallery.astro:24` | SEO, accessibilité |
| M3 | **`logo-transparent.png` (780 Ko)** présente dans `/public/` mais non utilisée — seul `logo-sm.png` est référencé | `public/images/logo-transparent.png` | 780 Ko servis inutilement |
| M4 | **`aussie-carte.jpg` orpheline** (150 Ko) — non référencée dans le code, nom "aussie" obsolète | `public/images/aussie-carte.jpg` | 150 Ko inutiles |
| M5 | **`favicon-32.png` orpheline** — non référencée dans BaseLayout | `public/favicon-32.png` | Fichier superflu |
| M6 | **Images non converties en WebP** — toutes les photos en JPG (hero-bg: 226 Ko, session-senior: 246 Ko…) | `public/images/*.jpg` | Impact PageSpeed/LCP |
| M7 | **`<Image />` Astro non utilisé** — images via `<img>` natif sans optimisation auto | Tous les composants | Pas d'optimisation automatique |

### Mineurs

| # | Problème | Localisation | Impact |
|---|---------|-------------|--------|
| m1 | **Email Web3Forms destination** — à confirmer que degroeve.j@gmail.com est bien configuré côté dashboard Web3Forms | Dashboard Web3Forms | Emails manqués si mal configuré |
| m2 | **Alt text `About.astro` animal cards** — `alt={animal.name}` trop court (ex: "Tips") | `src/components/sections/About.astro:100` | Accessibilité mineure |
| m3 | **Incohérence adresse** — `site-info/index.json` dit `city: "Vigny"` mais `llms.txt` dit "Vigny (secteur Verny)" — la commune est Vigny, le CP 57420 appartient à Verny | `src/content/site-info/index.json` | Cohérence données structurées |
| m4 | **Schema `geo` coordinates incorrectes** — index.astro utilise `latitude: 49.015, longitude: 6.195` alors que les vraies coordonnées Verny sont `49.0208014, 6.7659488` | `src/pages/index.astro:63-65` | Données structurées incorrectes |
| m5 | **`priceRange: "60€"` trop simple** dans Schema — devrait être `"€"` selon le standard Schema.org PriceRange | `src/data/business.ts` | Données structurées |

---

## Récapitulatif rapide

```
✅ SEO complet (meta, Schema, OG, sitemap, robots, llms)
✅ Legal/RGPD complet (ML, PC, cookies, formulaires)
✅ Accessibilité de base (skip, viewport, focus, lazy)
✅ PWA (webmanifest, icons, theme-color)
✅ Analytics présent mais ID manquant ← C1
✅ 12 pages, 15 composants, 3 vrais avis Google
❌ 2 alt texts incorrects PhotoGallery ← M1, M2
❌ Fichier parasite _tmp_32.png ← C2
❌ 3 fichiers orphelins (logo-transparent, aussie-carte, favicon-32) ← M3-M5
❌ Images non WebP ← M6-M7
❌ Coordonnées geo incorrectes dans Schema ← m4
```

---

## Prochaines étapes recommandées

| Étape | Priorité | Estimation |
|-------|----------|-----------|
| **Hotfix immédiat** | 🔴 | C1 (Umami ID), C2 (_tmp_32), M1/M2 (alt texts), m4 (geo coords) |
| **sa-02-design** | 🟡 | Vérification contraste WCAG AA, opacités texte blanc |
| **sa-04-seo** | 🟡 | 3-4 points à corriger (geo, priceRange, m3) |
| **sa-05-composants** | 🟡 | Tests visuels desktop + mobile de toutes les pages |
| **sa-07-performance** | 🟡 | WebP, Image Astro, PageSpeed ≥ 95, Lighthouse |
| **sa-06-legal** | 🟢 | Vérification formulaires, honeypot, RGPD |

**Score initial estimé : 82/100**

Pertes : analytics KO (-8), alt texts incorrects (-4), images non WebP (-4), fichiers parasites (-2)

**Score cible après corrections : ≥ 95/100**
