# Prospects v2 — CRM configurable par le client + capture facturation

**Date :** 2026-06-08
**Statut :** Design approuvé (Marc) → vers plan d'implémentation
**Projet pilote :** `projets/jd-zootherapeute/site` (repo `mavailable/site-jd-zootherapie`), onglet `/admin → Prospects` LIVE
**Base de référence :** `docs/superpowers/specs/2026-06-08-crm-clients-design.md` (CRM v1, déjà livré)

## Contexte & objectif

Le mini-CRM "Prospects" (v1) est en ligne : kanban 6 colonnes, fiches, bandeau relances, recherche, 154 prospects chargés (D1 `jdzoo-crm`). Deux extensions demandées, **couplées donc livrées en un seul round** :

1. **CRM configurable par le client** — un onglet **Réglages → Prospects** où le client (Jennifer) édite **les colonnes du funnel** et **active/désactive les champs** de la fiche. Aujourd'hui ces réglages sont figés dans `cms.config.ts` (édités par Marc) ; ils migrent vers un store éditable.
2. **Capture facturation** — le CRM devient la **base des futurs devis/factures** : on saisit les **détails client (facturation)** + les **détails de la vente (lignes)**. Génération du document = rounds ultérieurs (hors scope).

Couplage : les **toggles de champs** (feature 1) gouvernent l'affichage des **champs de facturation** (feature 2) → faire les deux séparément = double travail.

Contrainte maîtresse : **UX simple et fluide**. La plupart des 154 prospects n'auront jamais de vente → la facturation ne doit pas alourdir la fiche.

## Décisions verrouillées (brainstorm 2026-06-08)

1. **Périmètre capture = saisie seule** (pas de génération devis/facture ce round).
2. **Vente = lignes** : `{ désignation, quantité, prix unitaire net }`, total net auto → alimente `value`. **Une vente courante par fiche** (pas de multi-ventes).
3. **Placement capture = section repliable** « 💶 Facturation & vente » dans le `CrmModal` existant, repliée par défaut.
4. **Configurabilité = statuts/colonnes + toggles de champs prédéfinis** (PAS de champs 100 % custom / form-builder).
5. **Deux entrées vers les réglages** : onglet **Réglages** dédié **ET** roue crantée ⚙️ dans l'onglet Prospects (même destination).
6. **Tout en un round** (Settings + capture), plan phasé en interne.
7. **Micro-entreprise franchise TVA (art. 293 B)** : montants **nets**, pas de TVA/HT/TTC. Identité vendeur dans `business.ts`.

---

## Architecture — où vit la config

`cms.config.ts → crm.columns` devient le **défaut/seed**. Un **`crm_settings`** (singleton JSON en D1) le **surcharge** dès qu'il existe.

```jsonc
// crm_settings.data
{
  "columns": [
    { "id": "nouveau", "label": "Nouveau", "color": "#94a3b8", "hint": "À traiter" },
    { "id": "contacte", "label": "Contacté", "color": "#3b82f6", "hint": "Premier contact" }
    // … ordre = ordre d'affichage / flux des flèches
  ],
  "fields": {
    "org": true, "phone": true, "email": true, "value": true,
    "nextAction": true, "nextDate": true, "notes": true,
    "siret": false, "orderRef": false, "billing": true
  }
}
```

- **API** : `functions/api/crm/settings.js` → `onRequestGet` (renvoie le JSON stocké, ou `null` → le front applique les défauts) + `onRequestPut` (auth + origin, écrit le JSON). Binding D1 `DB`.
- `CrmTab` et `CrmModal` lisent les settings via un hook `useCrmSettings` (fallback `cms.config.ts` + tous champs ON).

---

## Feature 1 — Onglet « Réglages » → section Prospects

### Entrées (deux)
- **Onglet top-level ⚙️ Réglages** dans la nav `CmsApp` (route `#/reglages`), gaté comme les autres (pattern `vocaux`/`crm`). Ne contient que la section **Prospects** pour l'instant (extensible).
- **Roue crantée ⚙️** dans l'en-tête de l'onglet Prospects → `navigate('#/reglages')`.

### a) Éditeur de colonnes du funnel
Liste **réordonnable** (flèches ↑↓, pas de drag — cohérent v1, robuste mobile). Chaque colonne : **libellé**, **couleur** (palette de pastilles), **indice** (hint). Boutons **+ Ajouter** / **✕ Supprimer**.

**Garde-fous (critiques) :**
- Chaque colonne a un **`id` interne stable** (slug généré à la création). Le lien carte→statut se fait par `id`, **jamais par libellé** → renommer une colonne ne déplace aucune carte.
- **Supprimer une colonne non vide** : bloque et propose d'abord « déplacer ses N cartes vers → [autre colonne] » (PATCH des contacts concernés), puis retire la colonne.
- **Minimum 1 colonne** ; les colonnes ne peuvent pas toutes être supprimées.
- `name` et `status` (l'appartenance à une colonne) sont **toujours présents** (non désactivables).

### b) Toggles de champs de la fiche
Cases à cocher sur des **champs prédéfinis** (pas de champ custom). Décocher **masque** le champ dans le `CrmModal` (et l'aperçu carte le cas échéant) — **la donnée reste en base** (zéro perte, réversible).

| Champ | Défaut | Décochable |
|---|---|---|
| Nom, Étape | ON | **non** |
| Structure (`org`) | ON | oui |
| Téléphone, Email | ON | oui |
| Valeur € (estimation) | ON | oui |
| Prochaine action | ON | oui |
| Date de relance | ON | oui |
| Notes | ON | oui |
| SIRET client | OFF | oui |
| Réf. / bon de commande | OFF | oui |
| **Bloc Facturation & vente** | ON | oui |

Le bloc « Facturation & vente » est un **toggle unique** qui montre/masque toute la section (feature 2). `siret` et `orderRef` sont des sous-champs de ce bloc, toggables séparément.

---

## Feature 2 — Capture facturation (gouvernée par le toggle `billing`)

Section repliable **« 💶 Facturation & vente »** dans le `CrmModal`, sous les Notes, **rendue seulement si `fields.billing === true`**, repliée par défaut (chevron).

Dépliée :
```
Adresse de facturation   [ rue ........................ ]
[ CP ]  [ Ville ............ ]   À l'attention de [ contact ]
[SIRET client (si activé)]       [Réf. commande (si activé)]
── Lignes de vente ─────────────────────────────────────
 Désignation                      Qté    PU net (€)   ✕
 [ Séance de médiation animale ] [ 6 ] [  60,00  ]    ✕
 [ + ligne ]                              Total net : 480,00 €
 Date de vente  [ 12/06/2026 ]
```
- **Lignes** : ajout/suppression à la volée ; total recalculé en direct ; décimales **virgule FR** acceptées (parse `,`→`.`).
- **`value`** : si des lignes existent au save → `value = total net` (le `€` de la carte = la vraie vente) ; sinon `value` = estimation manuelle saisie ailleurs.
- Libellés **« net »** partout (franchise 293 B). Petit badge **💶** sur la carte du board quand une vente est saisie (`sale_lines` non vide).
- Un seul **Enregistrer** (tout dans le même modal, même flux qu'avant).

---

## Modèle de données (D1 `jdzoo-crm`)

**Nouvelle table** :
```sql
CREATE TABLE IF NOT EXISTS crm_settings (
  id         INTEGER PRIMARY KEY CHECK (id = 1),  -- singleton
  data       TEXT NOT NULL,                       -- JSON { columns, fields }
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Colonnes ajoutées à `contacts`** (`ALTER TABLE ADD COLUMN`, toutes nullables) :
`billing_address`, `billing_postal`, `billing_city`, `billing_contact`, `client_siret`, `order_ref`, `sale_lines` (TEXT JSON `[{label,qty,unit_price}]`), `sale_date` (TEXT `YYYY-MM-DD`).

`schema.sql` mis à jour (table + colonnes) pour les futurs clients du parc.

---

## Wiring / fichiers

- **D1** : migration `ALTER TABLE` (×8) + `CREATE TABLE crm_settings`, via l'API D1 (token `cloudflare-api-token`, scope D1:Edit déjà présent). `schema.sql` à jour.
- **API** : `functions/api/crm/settings.js` (GET/PUT, auth+origin) ; ajouter les 8 champs facturation à la whitelist `EDITABLE` du PATCH `contacts/[id].js`.
- **Hook** : `src/components/cms/crm/useCrmSettings.ts` (load/save settings, défauts).
- **Types** : étendre `Contact`/`ContactPatch` (8 champs) ; types `CrmSettings`, `CrmField`.
- **Réglages** : `src/components/cms/ReglagesTab.tsx` (+ sous-composant `crm/ProspectsSettings.tsx` : éditeur colonnes + toggles). Câblage CmsApp (route `#/reglages`, lazy, gaté).
- **CrmTab** : colonnes depuis les settings (fallback config) ; roue ⚙️ dans l'en-tête → `#/reglages` ; badge 💶 sur cartes avec vente.
- **CrmModal** : section repliable Facturation & vente + éditeur de lignes ; respecte les toggles de champs ; calcule `value`.

---

## Phasage interne du plan
1. **Store + colonnes** : table `crm_settings` + API GET/PUT + hook + éditeur de colonnes (Réglages) + CrmTab lit les settings (colonnes dynamiques, garde-fous suppression). Onglet Réglages + roue ⚙️.
2. **Toggles de champs** : section toggles dans Réglages + CrmModal/CrmTab respectent la visibilité.
3. **Capture facturation** : migration colonnes `contacts` + whitelist API + section repliable + lignes de vente + `value`=total + badge 💶.

---

## Non-goals (YAGNI / rounds futurs)
- Pas de **champs 100 % custom** (form-builder).
- Pas de **génération devis/facture** (PDF, numérotation, statut payé, conversion) — rounds 2/3.
- Pas de **multi-ventes** par prospect (une vente courante).
- Pas de réglages multi-features : l'onglet **Réglages** ne contient que **Prospects** pour l'instant.
- Pas de drag-and-drop (flèches ↑↓ pour réordonner les colonnes, cohérent v1).

## Risques / pièges
- **Suppression de colonne non vide** : toujours réassigner les cartes avant retrait (sinon cartes orphelines invisibles). Bloquant.
- **Stabilité des ids de colonnes** : ne jamais dériver le `status` d'un libellé ; id stable à la création.
- **Migration D1** : `ALTER TABLE ADD COLUMN` est idempotent à surveiller (vérifier l'existence ou ignorer l'erreur "duplicate column"). Pas de `wrangler.toml` (bindings dashboard/API).
- **Cohérence `value` vs lignes** : un seul chiffre € sur la carte ; total des lignes prime quand présent.
- **Défauts si pas de settings** : front robuste au `crm_settings` absent (applique `cms.config.ts` + tous champs ON).
