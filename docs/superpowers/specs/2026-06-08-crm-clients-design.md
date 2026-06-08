# Onglet "Clients" — Mini-CRM de suivi prospects/clients (/admin)

**Date :** 2026-06-08
**Statut :** Design approuvé (Marc, "go") → en route vers plan d'implémentation
**Projet pilote :** `projets/jd-zootherapeute/site` — repo `mavailable/site-jd-zootherapie`, CF Pages git-connected
**Portabilité :** feature générique destinée à "certains admin" du parc. jd-zoo = premier instanciation/test.

## Contexte & objectif

On ajoute au panel `/admin` d'un site client un **mini-CRM** : un kanban privé qui aide le client à suivre ses échanges avec **ses** prospects/clients, du premier contact au closing. La valeur n'est pas le tableau (déjà éprouvé via `BoardTab`) mais **savoir qui relancer et quand** : un vrai outil de suivi, pas une simple to-do.

Cahier des charges Marc : **précis, adaptable, et en même temps simple.**

On part du kanban générique existant (`BoardTab.tsx` de les-tagaloa, lui-même porté de l'IndiAmo `TasksTab`) et on l'adapte à un funnel de prospection/closing.

## Décisions verrouillées (brainstorm 2026-06-08)

1. **Modèle de carte = "CRM léger structuré"** (pas un simple board, pas un Pipedrive complet). La carte gagne des champs structurés : contact (tél/email), structure, valeur estimée €, **prochaine action + date de relance**, notes. Pas de timeline d'échanges (écartée = trop lourde pour la cible).
2. **Funnel = 6 colonnes** : `Nouveau → Contacté → RDV/échange → Devis envoyé → Gagné → Perdu`. Configurable par client ; c'est le défaut posé sur jd-zoo.
3. **Relances = bandeau récap en tête** du board ("🔔 À relancer", liste cliquable), + pastilles sur cartes + remontée des cartes en retard. C'est ce qui transforme le tableau en CRM.
4. **Stockage = Cloudflare D1** (vraie base SQL), pas le JSON-commit du BoardTab. Un CRM s'édite plusieurs fois/jour : sauvegardes instantanées, zéro commit, zéro rebuild, historique git propre.
5. **Une base D1 par client** (jamais partagée) : isolation dure, zéro risque de fuite cross-client.
6. **Composant + API génériques**, gatés par flag de config. Réutilisables sur d'autres admins du parc.
7. **Langue : FR** (locale jd-zoo).

---

## Architecture

### Composant `CrmTab.tsx`
Adapté du `BoardTab` éprouvé : on reprend toute l'UI kanban (colonnes, déplacement par flèches ← → strictement linéaire, modal carte cliquable, confirmation de suppression inline + modale, focus-trap, accessibilité clavier, grid responsive `auto-fit`). **Trois différences** avec BoardTab :
- carte enrichie (champs structurés vs `{title, detail, links}`) ;
- **bandeau relances** en tête ;
- **persistance D1** via fetch API au lieu de `useContent`/`saveFile` (commit git).

Mouvement : les flèches suivent le flux linéaire des 6 colonnes. La bascule vers *Perdu* (issue opposée, depuis n'importe quelle étape) se fait en ouvrant la carte → bouton de statut (le modal permet de sauter à n'importe quelle colonne, comme BoardTab).

### Persistance — Cloudflare D1
- Base **`jdzoo-crm`** (une par client), binding `DB`.
- Table `contacts` (schéma plus bas), `schema.sql` versionné dans le repo.

### API — Pages Functions
`functions/api/crm/*` : CRUD.
- `GET` list (tous les contacts), `POST` create, `PATCH` update (champs + status + sort), `DELETE`.
- **Toutes gatées** par `requireAuth(request, env)` (cookie HMAC, helper existant `functions/api/cms/_auth-helpers.js`) + `checkOrigin(request)` (anti-CSRF). Binding D1 `DB`.
- Réponses JSON, mêmes conventions que les Functions CMS existantes.

### Config — `cms.config.ts` (+ `cms.types.ts`)
Nouveau bloc :
```ts
crm: {
  enabled: true,
  label: 'Clients',
  // colonnes du funnel (ordre = flux gauche→droite)
  columns: [
    { status: 'nouveau', label: 'Nouveau',      hint: 'À traiter',         dot: '#9bafa9' },
    { status: 'contacte', label: 'Contacté',     hint: 'Premier contact',   dot: '#e9a368' },
    { status: 'rdv',      label: 'RDV / échange', hint: 'En discussion',    dot: '#58a9a1' },
    { status: 'devis',    label: 'Devis envoyé',  hint: 'Proposition faite', dot: '#3c7d77' },
    { status: 'gagne',    label: 'Gagné',         hint: 'Conclu ✅',         dot: '#15803d' },
    { status: 'perdu',    label: 'Perdu',         hint: 'Sans suite',        dot: '#b6a896' },
  ],
}
```
Onglet "Clients" gaté par `cmsConfig.crm?.enabled`, **lazy-loadé** (bundle des sites sans CRM inchangé), comme `VocauxTab`/`MarketingPlanTab`. Route `#/crm` dans CmsApp.

### Portabilité (autres admins du parc)
Pour activer le CRM sur un futur client : (1) créer sa base D1 + binding `DB`, (2) déployer les mêmes Functions `crm/*`, (3) activer `crm.enabled` + colonnes dans sa config. Composant et API génériques ; seules les colonnes/labels changent.

---

## Modèle de données — table D1 `contacts`

| col | type | rôle |
|---|---|---|
| `id` | INTEGER PRIMARY KEY | |
| `name` | TEXT NOT NULL | nom du contact **ou** de la structure (= titre carte) |
| `org` | TEXT | structure/entreprise, **optionnel** (EHPAD, école, IME…) — gère B2B *et* particuliers |
| `phone` | TEXT | cliquable `tel:` |
| `email` | TEXT | cliquable `mailto:` |
| `value` | REAL | valeur estimée €, **optionnel** |
| `status` | TEXT NOT NULL | `nouveau`/`contacte`/`rdv`/`devis`/`gagne`/`perdu` |
| `next_action` | TEXT | libellé prochaine action ("renvoyer le devis") |
| `next_date` | TEXT | date de relance, ISO date `YYYY-MM-DD` — moteur du bandeau |
| `notes` | TEXT | |
| `sort` | INTEGER | ordre dans la colonne |
| `created_at` | TEXT | ISO |
| `updated_at` | TEXT | ISO |

> **Note "HT"** : `value` est l'estimation **interne** du client pour son propre suivi, pas un prix qu'on facture → pas de mention "HT" imposée (la règle "prix toujours HT" vise les prix prospect-facing de Marc, pas un champ de tracking privé).

---

## UX — onglet "Clients"

- **En-tête** : titre "Clients" + courte intro.
- **Barre d'ajout rapide** : taper un nom → carte créée en colonne *Nouveau*.
- **🔔 Bandeau relances** (en tête du board) : liste les cartes dont `next_date ≤ aujourd'hui + 2j`, triées par urgence (*en retard → aujourd'hui → J+1/J+2*), chaque ligne cliquable (→ ouvre la carte). État zéro propre : *"Rien à relancer aujourd'hui ✅"*. Calcul en **date seule**, fuseau Europe/Paris (pas d'heure, pour rester simple).
- **6 colonnes** (cf. config). Flèches ← → linéaires ; bascule *Perdu* via le modal. Cartes en retard **remontées en haut** de leur colonne + pastille ⚠.
- **Carte** : nom (+ org si présent), pastille relance (⚠ en retard / ⏰ aujourd'hui / 📅 J+x), valeur €, aperçu de la prochaine action, badges 📞/✉ si renseignés.
- **Modal carte** (adapté du `BoardModal`) : nom · structure · tél · email · valeur € · statut (boutons colonnes) · **prochaine action + date de relance** (date picker natif) · notes. Tél/email rendus cliquables. Save → API D1 ; Delete → confirmation.
- **Mobile** : grid `auto-fit` (déjà géré) ; les 6 colonnes wrappent en 2-3 lignes.

---

## Câblage jd-zoo (pilote)

- Onglet **"Clients"** ajouté à la nav `CmsApp` (route `#/crm`), lazy + gaté par `crm.enabled`.
- **Infra** : créer D1 `jdzoo-crm`, déclarer le binding `DB` dans `wrangler.toml` (source de vérité — cf. `reference_cf_pages_wrangler_toml_env`), appliquer `schema.sql`, déployer les Functions.
- **Seed** : 2-3 cartes "(exemple)" que la cliente supprime, pour saisir l'outil d'un coup d'œil.
- **Test local** : D1 via `wrangler pages dev` (binding `--d1` / config local).

---

## Non-goals (YAGNI v1)

- Pas de **timeline d'échanges** par contact (option "CRM complet" écartée).
- Pas d'import/export, pas de pièces jointes.
- Pas de **rappels email/push** : le bandeau en tête suffit en v1.
- Pas de multi-utilisateur / rôles : un seul login (le mot de passe `/admin` existant).
- **Aucune synchro avec le CRM `leads-master` de Marc** : c'est l'outil *du client*, isolé dans sa propre base.

---

## Risques / pièges

- **Binding D1 sur CF Pages** : à déclarer dans `wrangler.toml` (la config dashboard est ignorée si toml présent). Rebuild requis pour prise en compte.
- **Test local D1** : nécessite `wrangler pages dev` (le `npm run dev` Astro seul ne sert pas les Functions/D1).
- **Calcul "en retard"** : date seule (`YYYY-MM-DD`), fuseau Europe/Paris, comparaison à la date du jour — pas d'heure, pour éviter les edge cases de timezone.
- **Auth** : bien gater **toutes** les routes `crm/*` (`requireAuth` + `checkOrigin`). Données privées (prospects du client).

## Phasage

Une seule phase (feature unique, bien bornée). Plan d'implémentation détaillé via `writing-plans` : schema D1 + Functions API → composant `CrmTab` (UI + bandeau + client API) → config + câblage nav → infra D1/binding → seed + QA (desktop/mobile) → déploiement preview.
