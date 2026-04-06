# CMS Web Factory — Roadmap vers le produit pro

## Vision

Un CMS visuel léger, intégré directement dans les sites Astro de l'agence. Le client modifie son site comme s'il le visitait : il clique sur un texte, il le change. Il clique sur une image, il la remplace. Zéro complexité, zéro jargon technique.

**Principes :**
- Édition visuelle inline (pas de formulaires séparés)
- Mobile-first (les artisans gèrent leur site depuis leur téléphone)
- Performant (< 150 KB gzip le bundle admin)
- Autonome (zéro dépendance externe, tout tourne sur CF Pages + GitHub)

---

## Phase 1 — Solidifier le MVP (stabilité + UX de base)

**Prompt :**

```
Tu travailles sur le CMS custom de l'agence Web Factory dans /Users/marcmuller/web factory/cms-template/.
Le MVP est fonctionnel (login, dashboard, éditeurs singleton/collection, TipTap rich text, API GitHub via CF Pages Functions).

Objectif : solidifier le MVP pour une utilisation en production.

Tâches :
1. GESTION D'ERREURS — Ajouter des états d'erreur visuels dans tous les composants (SingletonEditor, CollectionList, CollectionEditor). Afficher un message clair en français + bouton "Réessayer" quand un appel API échoue. Gérer le cas 409 Conflict (fichier modifié par quelqu'un d'autre) avec un message explicite et un bouton "Recharger".

2. AUTO-SAVE INDICATOR — Ajouter un indicateur visuel dans la barre de sauvegarde qui montre "Modifications non enregistrées" (point orange) quand le formulaire a été modifié. Désactiver le bouton Enregistrer quand rien n'a changé.

3. CONFIRMATION NAVIGATION — Empêcher la navigation (hashchange) quand il y a des modifications non enregistrées. Afficher un confirm() : "Vous avez des modifications non enregistrées. Quitter sans sauvegarder ?"

4. RESPONSIVE POLISH — Tester et corriger tous les composants sur mobile (375px). La barre de sauvegarde doit être sticky bottom, les cards du dashboard doivent passer en colonne unique, les champs Array doivent être utilisables au toucher (boutons assez grands).

5. LOADING SKELETONS — Remplacer le texte "Chargement..." par des skeleton loaders (rectangles gris animés) dans Dashboard, SingletonEditor et CollectionList.

6. KEYBOARD SHORTCUTS — Cmd+S / Ctrl+S pour sauvegarder depuis n'importe quel éditeur.

Tester sur le projet zompa-cms-test : cd "/Users/marcmuller/web factory/projets/zompa-cms-test/site" && npm run build
Copier les fichiers mis à jour du template vers zompa-cms-test après modification.
Push et vérifier le déploiement CF Pages.
```

---

## Phase 2 — Upload d'images (Cloudflare R2)

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.
Le CMS utilise des CF Pages Functions comme backend API et GitHub API pour lire/écrire les JSON.

Objectif : permettre aux clients d'uploader des images via le CMS.

Architecture :
- Stockage : Cloudflare R2 (bucket lié au projet CF Pages)
- Upload : CF Pages Function POST /api/cms/upload qui reçoit un FormData, upload vers R2, retourne l'URL publique
- Suppression : CF Pages Function DELETE /api/cms/image?key=...
- Liste : CF Pages Function GET /api/cms/images qui liste les images du bucket

Tâches :
1. BACKEND — Créer 3 nouvelles Functions :
   - functions/api/cms/upload.js : POST, reçoit FormData (file + alt text), resize si > 1920px large (via CF Image Resizing ou sharp si dispo), convertit en WebP, upload vers R2, retourne { url, key, width, height }
   - functions/api/cms/images.js : GET, liste toutes les images du bucket R2 avec métadonnées
   - functions/api/cms/image.js : DELETE, supprime une image du bucket

2. MEDIA LIBRARY — Créer un nouveau composant MediaLibrary.tsx accessible depuis le dashboard (nouvelle route #/media). Affiche une grille de toutes les images uploadées. Chaque image montre : preview, nom, taille, bouton supprimer. Bouton "Uploader" en haut avec drag & drop zone.

3. IMAGE FIELD V2 — Remplacer le ImageField.tsx actuel (simple input text) par un vrai sélecteur d'image :
   - Bouton "Choisir une image" qui ouvre la MediaLibrary en modal
   - Zone de drag & drop pour upload direct
   - Preview de l'image sélectionnée avec bouton "Changer" / "Supprimer"
   - Champ alt text éditable sous la preview

4. ENV VARS — Documenter les nouvelles env vars nécessaires : R2_BUCKET_NAME, R2_PUBLIC_URL. Le binding R2 se configure dans wrangler.toml ou CF Pages dashboard.

Tester sur zompa-cms-test. L'upload doit fonctionner end-to-end.
Env var R2 à configurer : créer un bucket R2 "zompa-cms-test-media" dans le dashboard CF.
```

---

## Phase 3 — Éditeur visuel inline (le coeur du produit)

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.
Actuellement le CMS a une page /admin séparée avec des formulaires. L'objectif est d'ajouter un MODE ÉDITION VISUELLE où le client modifie directement le contenu sur son site.

Concept UX :
- Le client visite son site normalement
- Il clique sur un bouton flottant "Modifier" (visible uniquement s'il est authentifié via /admin)
- Le site passe en "mode édition" : les zones éditables sont surlignées au hover
- Un clic sur un texte le rend éditable inline (contenteditable + TipTap)
- Un clic sur une image ouvre le sélecteur d'image (MediaLibrary)
- Une toolbar flottante apparaît en bas avec : Sauvegarder, Annuler, Quitter l'édition
- Les modifications sont enregistrées en batch (un seul commit GitHub)

Architecture technique :
1. DATA ATTRIBUTES — Dans les composants Astro du site (Hero.astro, About.astro, etc.), ajouter des attributs data-cms sur les éléments éditables :
   - data-cms-field="hero.title" (singleton.champ)
   - data-cms-field="services.massage.description" (collection.slug.champ)
   - data-cms-type="text|richtext|image" (type de champ)
   Ces attributs sont inertes en mode normal (aucun impact perf/SEO).

2. EDIT MODE SCRIPT — Créer src/scripts/cms-edit.ts :
   - Chargé uniquement quand le cookie cms_session existe (vérification légère)
   - Injecte le bouton flottant "Modifier"
   - Au clic, active le mode édition : scanne tous les [data-cms-field], ajoute les handlers
   - Pour text : contenteditable=true + style de focus
   - Pour richtext : monte un TipTap inline (import dynamique)
   - Pour image : overlay avec bouton "Changer l'image"
   - Collecte toutes les modifications dans un Map<path, {field, value}>

3. SAVE BATCH — Quand le client clique "Sauvegarder" :
   - Regroupe les modifications par fichier JSON
   - Fetch chaque fichier via /api/cms/content (pour avoir le sha + le contenu complet)
   - Merge les champs modifiés
   - POST /api/cms/save pour chaque fichier modifié
   - Toast de confirmation

4. INTEGRATION TEMPLATE — Ajouter un snippet conditionnel dans BaseLayout.astro :
   <script>
     if (document.cookie.includes('cms_session')) {
       import('/src/scripts/cms-edit.ts');
     }
   </script>
   Ce script fait ~2KB et ne charge TipTap que si le mode édition est activé.

Ne PAS modifier le dashboard existant (/admin) — il reste comme vue d'ensemble et pour les collections (ajouter/supprimer des items). L'édition visuelle est un mode complémentaire, pas un remplacement.

Tester sur zompa-cms-test : modifier le titre H1 du hero inline, sauvegarder, vérifier que le commit GitHub est correct et que le site se redéploie avec le nouveau contenu.
```

---

## Phase 4 — Édition de styles (couleurs, typo, espacements)

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.
Le CMS a maintenant un mode édition visuelle inline. L'objectif est de permettre au client de modifier les styles visuels de son site.

Scope des styles éditables :
- Couleurs principales (primary, accent, neutral) — modifie les tokens Tailwind v4
- Typographie (font-heading, font-body) — parmi les fonts locales installées
- Rayon des bordures (radius) — arrondi des boutons/cards
- Espacements hero (padding vertical)
- Couleur du header/footer (light/dark)

Architecture :
1. STYLE CONFIG FILE — Créer src/data/theme.json qui contient les tokens éditables :
   {
     "colors": {
       "primary": "#2563eb",
       "primary-light": "#eff6ff",
       "accent": "#f59e0b",
       "neutral": "#1e293b"
     },
     "fonts": {
       "heading": "DM Sans",
       "body": "Inter"
     },
     "radius": "8px",
     "header": "light"
   }
   Ce fichier est lu par le CSS via @theme et par les composants.

2. THEME EDITOR PANEL — Créer un panneau latéral (slide-in depuis la droite) accessible depuis le mode édition visuelle (bouton palette dans la toolbar). Le panneau contient :
   - Color pickers pour chaque couleur (utiliser un input type="color" natif + hex input)
   - Sélecteur de font parmi les fonts disponibles dans le projet (scanner public/fonts/)
   - Slider pour le border-radius (0px à 24px)
   - Toggle header light/dark
   - Preview en temps réel (les changements s'appliquent immédiatement via CSS custom properties)

3. SAVE THEME — Le panneau sauvegarde theme.json via l'API GitHub (même mécanisme que les autres JSON). Le CSS du site doit lire ces valeurs. Adapter le global.css pour utiliser les custom properties de theme.json.

4. FONTS DISPONIBLES — Scanner le dossier public/fonts/ pour lister les fonts disponibles. Afficher le nom de chaque font dans son propre style (preview).

Contrainte : les modifications de style doivent être réversibles. Garder les valeurs par défaut du design-system.md comme fallback.

Tester sur zompa-cms-test : changer la couleur primary, vérifier que tout le site se met à jour (boutons, liens, accents).
```

---

## Phase 5 — Gestion des sections (réorganisation de page)

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.

Objectif : permettre au client de réorganiser, masquer/afficher et dupliquer les sections de sa page d'accueil.

Concept UX :
- En mode édition visuelle, un bouton "Sections" apparaît dans la toolbar
- Ouvre un panneau latéral gauche listant toutes les sections de la page dans l'ordre
- Chaque section : nom + icône + toggle visible/masqué + poignée de drag
- Drag & drop pour réorganiser les sections
- Le client peut masquer une section sans la supprimer (elle reste dans le code, juste cachée)

Architecture :
1. SECTIONS CONFIG — Créer src/content/layout/index.json :
   {
     "sections": [
       { "id": "hero", "visible": true, "order": 0 },
       { "id": "stats", "visible": true, "order": 1 },
       { "id": "services", "visible": true, "order": 2 },
       { "id": "about", "visible": true, "order": 3 },
       { "id": "testimonials", "visible": true, "order": 4 },
       { "id": "faq", "visible": true, "order": 5 },
       { "id": "contact", "visible": true, "order": 6 }
     ]
   }

2. PAGE TEMPLATE — Modifier index.astro pour lire layout/index.json et rendre les sections dans l'ordre spécifié, en sautant celles marquées invisible.

3. SECTION MANAGER UI — Composant SectionManager.tsx avec :
   - Liste ordonnée des sections avec drag & drop (utiliser l'API native HTML Drag and Drop, pas de lib)
   - Toggle on/off pour chaque section
   - Sauvegarde dans layout/index.json via l'API CMS

4. Ajouter "layout" comme singleton dans cms.config.ts.

Tester sur zompa-cms-test : masquer la section FAQ, réorganiser services avant about, vérifier que le site reflète les changements après deploy.
```

---

## Phase 6 — Historique et rollback

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.

Objectif : permettre au client de voir l'historique des modifications et de revenir à une version précédente.

Architecture :
1. HISTORY API — Nouvelle Function GET /api/cms/history?path=... qui utilise l'API GitHub Commits pour lister les commits qui ont modifié un fichier donné. Retourne : date, message, sha du commit.

2. FILE AT COMMIT — Nouvelle Function GET /api/cms/version?path=...&ref=SHA qui lit le contenu d'un fichier à un commit spécifique (GitHub API: GET /repos/{owner}/{repo}/contents/{path}?ref={sha}).

3. HISTORY PANEL — Dans le SingletonEditor et CollectionEditor, ajouter un bouton "Historique" qui ouvre un panneau latéral avec :
   - Liste chronologique des modifications (date + message de commit)
   - Clic sur une version → affiche le contenu de cette version dans un diff visuel (champs côte à côte : actuel vs sélectionné)
   - Bouton "Restaurer cette version" qui sauvegarde l'ancienne version comme nouveau commit

4. UX — Limiter à 20 dernières versions. Afficher les dates en format relatif français ("il y a 2 heures", "hier", "le 15 mars").

Tester : modifier le hero 3 fois, vérifier l'historique, restaurer la première version.
```

---

## Phase 7 — SEO & Meta éditables

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.

Objectif : permettre au client de modifier les métadonnées SEO de chaque page.

Tâches :
1. SEO SINGLETON — Ajouter un singleton "seo" dans cms.config.ts avec :
   - Pour chaque page : title, description, og:image
   - Champ "robots" (indexer oui/non)
   - Preview Google (snippet qui montre title + description tronqués comme dans les résultats Google)
   - Preview réseaux sociaux (card OG avec image + title + description)

2. SEO PANEL en mode édition — Dans la toolbar du mode édition visuelle, ajouter un bouton "SEO" qui ouvre un panneau avec les champs meta de la page courante.

3. GOOGLE PREVIEW COMPONENT — Composant qui simule un résultat Google :
   - Titre en bleu (tronqué à 60 chars avec compteur)
   - URL en vert
   - Description en gris (tronquée à 160 chars avec compteur)
   - Compteurs rouge quand trop long

4. OG PREVIEW COMPONENT — Composant qui simule une card Facebook/LinkedIn :
   - Image og:image
   - Titre
   - Description
   - Domaine

Tester : modifier le titre SEO de la page d'accueil, vérifier que le <title> change dans le HTML généré.
```

---

## Phase 8 — Analytics dashboard intégré

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.
Les sites utilisent Umami Cloud pour l'analytics.

Objectif : intégrer un mini dashboard analytics directement dans le CMS.

Tâches :
1. UMAMI API PROXY — Nouvelle Function GET /api/cms/analytics qui proxy les appels vers l'API Umami Cloud. Env vars : UMAMI_API_URL, UMAMI_WEBSITE_ID, UMAMI_API_KEY.

2. ANALYTICS DASHBOARD — Nouvelle route #/analytics dans le CMS avec :
   - Visiteurs aujourd'hui / cette semaine / ce mois (gros chiffres)
   - Graphique simple de visiteurs sur 30 jours (barres SVG, pas de lib de charts)
   - Top 5 pages les plus visitées
   - Sources de trafic (direct, Google, réseaux sociaux)
   - Appareils (desktop vs mobile %)

3. DASHBOARD HOME — Ajouter une card "Statistiques" sur le dashboard principal avec les visiteurs du jour et un lien "Voir les détails →".

4. WIDGET EN MODE EDITION — En mode édition visuelle, afficher discrètement le nombre de visiteurs du jour dans la toolbar.

Pas de dépendance à une lib de charts — utiliser du SVG inline pour les barres.

Tester : vérifier que les données Umami s'affichent correctement (ou un fallback propre si Umami n'est pas configuré).
```

---

## Phase 9 — Performance et polish final

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/.

Objectif : optimiser les performances et polir l'UX pour un produit fini.

Tâches :
1. CODE SPLITTING — Séparer le bundle CMS en chunks :
   - Core (auth, dashboard, routing) : < 30 KB gzip
   - Éditeurs (singleton, collection) : chargé à la demande
   - TipTap : chargé uniquement quand un champ richtext est visible
   - MediaLibrary : chargé uniquement quand ouvert
   Utiliser React.lazy() + Suspense.

2. API CACHING — Cache les réponses GET /api/cms/content et /api/cms/list dans un Map en mémoire côté client (invalidé après un save). Évite de re-fetch le même fichier à chaque navigation.

3. OPTIMISTIC UI — Quand le client sauvegarde :
   - Mettre à jour l'UI immédiatement (pas attendre la réponse API)
   - Afficher le toast de succès
   - Si l'API échoue, rollback l'UI et afficher l'erreur
   - Le sha est mis à jour en background

4. ANIMATIONS — Ajouter des transitions CSS subtiles :
   - Fade in/out des vues (dashboard → éditeur)
   - Slide des panneaux latéraux
   - Scale des toasts
   - Skeleton shimmer effect
   Pas de lib d'animation — CSS transitions + @keyframes uniquement.

5. PWA LIGHT — Ajouter un manifest.json pour /admin avec :
   - "display": "standalone"
   - Icône de l'agence
   - Le client peut "ajouter à l'écran d'accueil" sur mobile → ouvre directement le CMS

6. ACCESSIBILITY — Audit WCAG :
   - Focus visible sur tous les éléments interactifs
   - Labels ARIA sur les boutons icônes
   - Navigation clavier complète (Tab, Enter, Escape)
   - Contraste minimum AA sur tous les textes

7. ERROR BOUNDARY — Composant React ErrorBoundary global qui catch les crashes et affiche un message propre + bouton "Recharger" au lieu d'un écran blanc.

Objectif final : bundle < 150 KB gzip, First Contentful Paint < 1s sur /admin, 0 erreur console.

Tester : npm run build, vérifier la taille des chunks. Lighthouse audit sur /admin (cible : Performance 90+).
```

---

## Phase 10 — Skill wf-00-cms et intégration pipeline

**Prompt :**

```
Tu travailles sur le CMS custom dans /Users/marcmuller/web factory/cms-template/ et les skills dans /Users/marcmuller/web factory/skills/.

Objectif : intégrer le CMS dans le pipeline Web Factory pour que chaque nouveau projet l'utilise automatiquement.

Tâches :
1. SKILL wf-00-cms — Créer skills/wf-00-cms/SKILL.md qui remplace wf-00-keystatic/SKILL.md :
   - Documenter le format JSON flat files (identique)
   - Documenter les env vars CF Pages (CMS_PASSWORD, CMS_SESSION_SECRET, GITHUB_TOKEN, CMS_REPO, CMS_BRANCH, R2 bindings)
   - Documenter les routes : /admin, /api/cms/*
   - Documenter les data attributes pour l'édition inline
   - Conventions de nommage des fichiers content

2. MODIFIER wf-05-init-projet — Adapter le skill pour :
   - Copier cms.types.ts et cms.config.ts (template) au lieu de keystatic.config.ts
   - Copier functions/api/cms/ (7 fichiers)
   - Copier src/components/cms/ (toute l'arborescence)
   - Copier src/pages/admin.astro
   - Copier src/styles/cms.css
   - Ajouter les deps TipTap dans package.json
   - Retirer les deps Keystatic
   - Adapter astro.config.mjs (output: 'static', pas de keystatic(), pas de cloudflare adapter)
   - Ajouter /admin dans le filtre sitemap

3. MODIFIER wf-10-deploiement — Adapter pour :
   - Créer les env vars CMS sur CF Pages (au lieu du setup Keystatic Cloud)
   - Générer un mot de passe client aléatoire
   - Configurer le bucket R2 si le projet utilise l'upload d'images
   - Tester le login /admin après déploiement

4. MODIFIER wf-dashboard-client — Remplacer les liens Keystatic par /admin#/...

5. MODIFIER wf-06a et wf-06b — Ajouter les data-cms-field attributes sur les composants pour l'édition inline.

6. MODIFIER wf-08-integration — Adapter la section CMS pour référencer /admin au lieu de /keystatic.

7. RETIRER wf-00-keystatic — Archiver (renommer en wf-00-keystatic-legacy.md) ou supprimer.

Tester : simuler un wf-05 sur un projet fictif et vérifier que la structure complète est générée avec le CMS custom.
```

---

## Ordre d'exécution recommandé

| Phase | Priorité | Dépendance | Impact client |
|-------|----------|------------|---------------|
| 1. Stabilité + UX | Critique | Aucune | Utilisable en prod |
| 2. Upload images | Haute | Phase 1 | Autonomie totale |
| 3. Édition inline | Haute | Phase 2 | Effet "wow" |
| 4. Styles | Moyenne | Phase 3 | Personnalisation |
| 5. Sections | Moyenne | Phase 3 | Flexibilité |
| 6. Historique | Moyenne | Phase 1 | Sécurité / confiance |
| 7. SEO | Moyenne | Phase 3 | Valeur ajoutée |
| 8. Analytics | Basse | Phase 1 | Nice-to-have |
| 9. Performance | Haute | Phases 1-5 | Qualité produit |
| 10. Pipeline | Critique | Phases 1-3 | Industrialisation |

Phases 1 + 2 + 3 = produit viable différenciant.
Phases 4 à 9 = features progressives.
Phase 10 = industrialisation.
