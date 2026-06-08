# Prospects v2 — CRM configurable + capture facturation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le CRM "Prospects" configurable par le client (onglet Réglages → colonnes du funnel + toggles de champs) et ajouter la capture des détails de facturation/vente (adresse client + lignes de vente net) comme base des futurs devis/factures.

**Architecture:** Un singleton JSON `crm_settings` en D1 (colonnes + toggles) surcharge les défauts de `cms.config.ts`. Un onglet `Réglages` (+ roue ⚙️ dans Prospects) édite ces settings. `CrmTab`/`CrmModal` lisent les settings via un hook. La fiche gagne une section repliable « Facturation & vente » (lignes désignation×qté×PU net, total auto → `value`), gouvernée par un toggle.

**Tech Stack:** Astro v5 (`output: 'static'`) + React islands, Cloudflare Pages Functions + D1, vitest (helpers purs), auth cookie HMAC existante.

**Spec :** `docs/superpowers/specs/2026-06-08-prospects-v2-config-facturation-design.md`
**Conventions (CLAUDE.md) :** FR, branche `master`, commit + push à chaque tâche. jd-zoo : `/admin` commite direct sur master → **toujours `git fetch origin master` + rebase avant push**. Build CF = `astro build` (ne type-check pas les islands) → lancer aussi `npx tsc --noEmit` est utile mais le repo a une baseline d'erreurs préexistantes (GbpPostsTab, StatsTab…) ; ne juger QUE les fichiers de la tâche.

**D1 :** base `jdzoo-crm` uuid `c63f0564-9764-4856-bb8c-9999bbbb9be5`, binding `DB`. Token Keychain `cloudflare-api-token` (scope D1:Edit + Pages:Edit). Migration live = **exécutée par le contrôleur** (pas un subagent) via l'API D1 REST.

---

## File Structure

**Créés :**
- `src/components/cms/crm/crmTypes.ts` — *(modifié)* + `CrmColumn` (a déjà status/label/hint/dot), `CrmSettings`, `CrmFieldKey`, `SaleLine`, extension `Contact`/`ContactPatch`.
- `src/components/cms/crm/crmSettings.ts` — pur : défauts, merge config↔settings, génération d'id de colonne, résolution de visibilité de champ. **Testé.**
- `src/components/cms/crm/crmSettings.test.ts` — vitest.
- `src/components/cms/crm/saleHelpers.ts` — pur : parse montant FR, total ligne, total vente. **Testé.**
- `src/components/cms/crm/saleHelpers.test.ts` — vitest.
- `src/components/cms/crm/useCrmSettings.ts` — hook load/save settings (API).
- `src/components/cms/crm/ProspectsSettings.tsx` — UI réglages : éditeur de colonnes + toggles de champs.
- `src/components/cms/crm/SaleSection.tsx` — section repliable Facturation & vente du modal.
- `src/components/cms/ReglagesTab.tsx` — shell de l'onglet Réglages (rend ProspectsSettings).
- `functions/api/crm/settings.js` — GET/PUT du singleton crm_settings (D1, auth+origin).

**Modifiés :**
- `schema.sql` — table `crm_settings` + 8 colonnes `contacts`.
- `functions/api/crm/contacts/[id].js` — 8 champs facturation ajoutés à `EDITABLE`.
- `src/components/cms/CmsApp.tsx` — câblage onglet Réglages (lazy/TabId/Route/parseHash/getActiveTab/ALL_TABS/getTabs/render).
- `src/components/cms/locales.ts` — clé `tabReglages` (FR+EN).
- `src/components/cms/crm/CrmTab.tsx` — colonnes depuis settings, roue ⚙️ → `#/reglages`, badge 💶, passe settings au modal.
- `src/components/cms/crm/CrmModal.tsx` — respecte les toggles, intègre `SaleSection`, calcule `value`.

**Infra (contrôleur, hors fichiers) :** migration live D1 (Task 1 step "live").

---

## PHASE 1 — Store settings + colonnes configurables

### Task 1 : Migration D1 (schema + live)

**Files:** Modify `schema.sql`

- [ ] **Step 1 : étendre `schema.sql`** — ajouter à la fin :

```sql
-- v2 : réglages CRM éditables par le client (singleton).
CREATE TABLE IF NOT EXISTS crm_settings (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  data       TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- v2 : champs facturation / vente (base devis & factures). Tous nullables.
ALTER TABLE contacts ADD COLUMN billing_address TEXT;
ALTER TABLE contacts ADD COLUMN billing_postal  TEXT;
ALTER TABLE contacts ADD COLUMN billing_city    TEXT;
ALTER TABLE contacts ADD COLUMN billing_contact TEXT;
ALTER TABLE contacts ADD COLUMN client_siret    TEXT;
ALTER TABLE contacts ADD COLUMN order_ref       TEXT;
ALTER TABLE contacts ADD COLUMN sale_lines      TEXT;  -- JSON [{label,qty,unit_price}]
ALTER TABLE contacts ADD COLUMN sale_date       TEXT;  -- 'YYYY-MM-DD'
```
> Note : pour un **nouveau** client le `schema.sql` se rejoue d'un bloc ; les `ALTER` échoueraient sur une base fraîche où la table contacts est créée juste au-dessus → c'est OK car ils s'exécutent après le `CREATE TABLE contacts`. Pour la base **existante** jdzoo-crm, voir Step 3 (idempotent).

- [ ] **Step 2 : commit**
```bash
git add schema.sql
git commit -m "feat(crm): schéma v2 — crm_settings + colonnes facturation"
git fetch origin master && git rebase origin/master
git push origin master
```

- [ ] **Step 3 : migration LIVE de jdzoo-crm — EXÉCUTÉE PAR LE CONTRÔLEUR** (pas le subagent : mutation d'une base client en prod). Le contrôleur lance, idempotent (ignore "duplicate column name") :
```
POST https://api.cloudflare.com/client/v4/accounts/f10c67586bb0938bbe0e8b8eccdef39b/d1/database/c63f0564-9764-4856-bb8c-9999bbbb9be5/query
# 1) CREATE TABLE crm_settings (…)
# 2) chaque ALTER TABLE … ADD COLUMN … séparément ; sur erreur "duplicate column name" → continuer
```
Vérif : `PRAGMA table_info(contacts)` doit lister les 8 colonnes ; `SELECT name FROM sqlite_master WHERE name='crm_settings'`.
> Un subagent qui atteint cette tâche doit s'arrêter et reporter `BLOCKED: migration live à exécuter par le contrôleur`.

---

### Task 2 : Types

**Files:** Modify `src/components/cms/crm/crmTypes.ts`

- [ ] **Step 1 : étendre les types.** Ajouter les 8 champs à `Contact` (après `notes`), à `ContactPatch` (le `Pick`), et ajouter les nouveaux types. Le fichier actuel contient déjà `Contact`, `ContactPatch`, `CrmColumn` (status/label/hint/dot), `RelanceKind`, `Relance`.

Dans `interface Contact`, ajouter avant `sort`:
```ts
  billing_address?: string | null;
  billing_postal?: string | null;
  billing_city?: string | null;
  billing_contact?: string | null;
  client_siret?: string | null;
  order_ref?: string | null;
  sale_lines?: string | null; // JSON string
  sale_date?: string | null;
```
Dans `ContactPatch`, étendre le `Pick<Contact, ...>` pour inclure ces 8 clés (en plus des existantes).

Ajouter en fin de fichier :
```ts
export interface SaleLine {
  label: string;
  qty: number;
  unit_price: number; // net
}

// Clés des champs toggables (Nom/Étape jamais toggables).
export type CrmFieldKey =
  | 'org' | 'phone' | 'email' | 'value' | 'nextAction' | 'nextDate' | 'notes'
  | 'siret' | 'orderRef' | 'billing';

// Colonne telle que stockée dans les réglages (≠ CrmColumn du board : id/color, pas status/dot).
export interface CrmSettingsColumn {
  id: string;
  label: string;
  hint: string;
  color: string;
}

export interface CrmSettings {
  columns: CrmSettingsColumn[];
  fields: Record<CrmFieldKey, boolean>;
}
```

- [ ] **Step 2 : build + commit**
```bash
npm run build   # doit passer
git add src/components/cms/crm/crmTypes.ts
git commit -m "feat(crm): types v2 (champs facturation, CrmSettings, SaleLine)"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 3 : Helpers settings (purs, TDD)

**Files:** Create `src/components/cms/crm/crmSettings.ts` + `crmSettings.test.ts`

- [ ] **Step 1 : test (échoue)** — `src/components/cms/crm/crmSettings.test.ts` :
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_FIELDS, defaultSettings, mergeSettings, genColumnId, isFieldOn } from './crmSettings';

const COLS = [
  { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
  { status: 'gagne', label: 'Gagné', hint: 'Conclu', dot: '#16a34a' },
];

describe('defaultSettings', () => {
  it('mappe les colonnes config (status→id) et active tous les champs sauf siret/orderRef', () => {
    const s = defaultSettings(COLS);
    expect(s.columns).toEqual([
      { id: 'nouveau', label: 'Nouveau', hint: 'À traiter', color: '#94a3b8' },
      { id: 'gagne', label: 'Gagné', hint: 'Conclu', color: '#16a34a' },
    ]);
    expect(s.fields.phone).toBe(true);
    expect(s.fields.siret).toBe(false);
    expect(s.fields.orderRef).toBe(false);
    expect(s.fields.billing).toBe(true);
  });
});

describe('mergeSettings', () => {
  it('renvoie les défauts si stored est null', () => {
    expect(mergeSettings(COLS, null).columns.length).toBe(2);
  });
  it('complète les champs manquants du stored par les défauts', () => {
    const m = mergeSettings(COLS, { columns: [{ id: 'x', label: 'X', hint: '', color: '#000' }], fields: { phone: false } } as any);
    expect(m.columns).toEqual([{ id: 'x', label: 'X', hint: '', color: '#000' }]);
    expect(m.fields.phone).toBe(false); // override
    expect(m.fields.email).toBe(true);  // défaut conservé
  });
  it('ignore un stored sans colonnes valides (fallback défauts)', () => {
    expect(mergeSettings(COLS, { columns: [], fields: {} } as any).columns.length).toBe(2);
  });
});

describe('genColumnId', () => {
  it('slugifie le libellé', () => {
    expect(genColumnId('RDV / échange', [])).toBe('rdv-echange');
  });
  it('évite les collisions', () => {
    expect(genColumnId('Nouveau', ['nouveau'])).toBe('nouveau-2');
    expect(genColumnId('Nouveau', ['nouveau', 'nouveau-2'])).toBe('nouveau-3');
  });
  it('fallback si libellé vide', () => {
    expect(genColumnId('', ['col'])).toBe('col-2');
  });
});

describe('isFieldOn', () => {
  it('vrai par défaut pour une clé absente', () => {
    expect(isFieldOn({ columns: [], fields: {} } as any, 'phone')).toBe(true);
  });
  it('respecte false', () => {
    expect(isFieldOn({ columns: [], fields: { phone: false } } as any, 'phone')).toBe(false);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec** — `npm test -- crmSettings` → FAIL (module absent).

- [ ] **Step 3 : implémenter** — `src/components/cms/crm/crmSettings.ts` :
```ts
import type { CrmSettings, CrmFieldKey } from './crmTypes';

// CrmColumn de la config (status/label/hint/dot) → colonne settings (id/label/hint/color).
interface ConfigColumn { status: string; label: string; hint: string; dot: string; }

export const DEFAULT_FIELDS: Record<CrmFieldKey, boolean> = {
  org: true, phone: true, email: true, value: true, nextAction: true,
  nextDate: true, notes: true, siret: false, orderRef: false, billing: true,
};

export function defaultSettings(configColumns: ConfigColumn[]): CrmSettings {
  return {
    columns: configColumns.map((c) => ({ id: c.status, label: c.label, hint: c.hint, color: c.dot })),
    fields: { ...DEFAULT_FIELDS },
  };
}

// Fusionne les réglages stockés sur les défauts. Stored partiel/invalide → défauts.
export function mergeSettings(configColumns: ConfigColumn[], stored: CrmSettings | null): CrmSettings {
  const def = defaultSettings(configColumns);
  if (!stored) return def;
  const columns = Array.isArray(stored.columns) && stored.columns.length > 0 ? stored.columns : def.columns;
  return { columns, fields: { ...def.fields, ...(stored.fields || {}) } };
}

export function genColumnId(label: string, existing: string[]): string {
  const base = label.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'col';
  if (!existing.includes(base)) return base;
  let n = 2;
  while (existing.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export function isFieldOn(settings: CrmSettings, key: CrmFieldKey): boolean {
  return settings.fields?.[key] !== false;
}
```

- [ ] **Step 4 : lancer, vérifier le succès** — `npm test -- crmSettings` → PASS.
- [ ] **Step 5 : commit**
```bash
git add src/components/cms/crm/crmSettings.ts src/components/cms/crm/crmSettings.test.ts
git commit -m "feat(crm): helpers settings (défauts, merge, slug id, visibilité) TDD"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 4 : API settings (D1)

**Files:** Create `functions/api/crm/settings.js`

- [ ] **Step 1 : écrire** `functions/api/crm/settings.js` :
```js
// /api/crm/settings — GET (lire le singleton) | PUT (écrire). Réglages CRM (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../cms/_auth-helpers.js';

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestGet({ request, env }) {
  try { await requireAuth(request, env); } catch (r) { return r; }
  if (!env.DB) return bad('Base de données non configurée', 500);
  try {
    const row = await env.DB.prepare('SELECT data FROM crm_settings WHERE id = 1').first();
    const settings = row && row.data ? JSON.parse(row.data) : null;
    return new Response(JSON.stringify({ settings }), { status: 200, headers: jsonHeaders() });
  } catch {
    return bad('Erreur lecture réglages', 500);
  }
}

export async function onRequestPut({ request, env }) {
  try { await requireAuth(request, env); } catch (r) { return r; }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);
  let body;
  try { body = await request.json(); } catch { return bad('JSON invalide'); }
  const settings = body && body.settings;
  if (!settings || !Array.isArray(settings.columns) || settings.columns.length === 0) {
    return bad('Réglages invalides (au moins une colonne)');
  }
  try {
    await env.DB.prepare(
      `INSERT INTO crm_settings (id, data, updated_at) VALUES (1, ?, datetime('now'))
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`
    ).bind(JSON.stringify(settings)).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
  } catch {
    return bad('Erreur écriture réglages', 500);
  }
}
```
- [ ] **Step 2 : vérif gate (best-effort)** — `npm run build` OK ; si possible `npx wrangler pages dev dist` puis `curl -s -o /dev/null -w '%{http_code}' http://localhost:8788/api/crm/settings` → `401`. Sinon noter et valider en preview.
- [ ] **Step 3 : commit**
```bash
git add functions/api/crm/settings.js
git commit -m "feat(crm): API settings D1 GET/PUT (auth+origin)"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 5 : Hook `useCrmSettings`

**Files:** Create `src/components/cms/crm/useCrmSettings.ts`

- [ ] **Step 1 : écrire** :
```ts
import { useState, useEffect, useCallback } from 'react';
import cmsConfig from '../../../cms.config';
import { mergeSettings } from './crmSettings';
import type { CrmSettings } from './crmTypes';

const CONFIG_COLUMNS = (cmsConfig.crm?.columns as any[]) || [];

export function useCrmSettings() {
  const [settings, setSettings] = useState<CrmSettings>(() => mergeSettings(CONFIG_COLUMNS, null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/crm/settings', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
      setSettings(mergeSettings(CONFIG_COLUMNS, data.settings || null));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (next: CrmSettings) => {
    const res = await fetch('/api/crm/settings', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: next }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
    setSettings(next);
  }, []);

  return { settings, loading, error, reload: load, save };
}
```
- [ ] **Step 2 : build + commit**
```bash
npm run build
git add src/components/cms/crm/useCrmSettings.ts
git commit -m "feat(crm): hook useCrmSettings (load/save + défauts config)"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 6 : Onglet Réglages + éditeur de colonnes + CrmTab lit les settings

**Files:** Create `ReglagesTab.tsx`, `ProspectsSettings.tsx` ; Modify `CmsApp.tsx`, `locales.ts`, `CrmTab.tsx`

- [ ] **Step 1 : `ProspectsSettings.tsx`** (cette tâche = partie COLONNES ; les toggles arrivent Task 7 dans le même fichier). Composant qui édite les colonnes via `useCrmSettings`. Reprend la palette admin neutre (`#0f172a/#64748b/#e2e8f0/#f8fafc/#3b82f6`). Comportement :
  - liste des colonnes ; par colonne : input libellé, input hint, sélecteur de couleur (8 pastilles), boutons ↑ ↓ (réordonner), ✕ (supprimer).
  - **Supprimer** : si la colonne contient des cartes (compte via un GET `/api/crm/contacts` filtré côté client OU via le store déjà chargé passé en prop), demander d'abord de **déplacer vers une autre colonne** (PATCH des contacts concernés) — voir Step 1b. Bloquer si c'est la dernière colonne.
  - **+ Ajouter une colonne** : génère un id via `genColumnId(label, existingIds)`.
  - bouton **Enregistrer** → `save(settings)`.

Donner le code complet de la partie colonnes (state local copié des settings, handlers move/edit/add/remove, palette de couleurs `['#94a3b8','#3b82f6','#0ea5e9','#f59e0b','#16a34a','#cbd5e1','#a855f7','#ef4444']`). *(Le code intégral sera fourni au dispatch ; il suit le style inline-styles des autres composants cms.)*

- [ ] **Step 1b : déplacement des cartes à la suppression** — la suppression d'une colonne non vide ouvre une mini-confirmation « Déplacer ses N cartes vers [select colonnes] » ; au valider : pour chaque contact de ce statut, `PATCH /api/crm/contacts/:id { status: target }` (réutiliser un petit client fetch), puis retirer la colonne et `save`. Le compte de cartes par statut vient d'un `GET /api/crm/contacts` (les contacts sont aussi dispo si on passe `contacts` en prop depuis un parent — ici ProspectsSettings fait son propre fetch léger pour rester autonome).

- [ ] **Step 2 : `ReglagesTab.tsx`** — shell minimal :
```tsx
import { ProspectsSettings } from './crm/ProspectsSettings';

export function ReglagesTab() {
  return (
    <div style={{ maxWidth: '52rem', margin: '0 auto' }}>
      <ProspectsSettings />
    </div>
  );
}
```

- [ ] **Step 3 : câbler l'onglet dans `CmsApp.tsx`** (pattern identique à `crm`/`vocaux`) :
  - lazy : `const ReglagesTab = lazy(() => import('./ReglagesTab').then((m) => ({ default: m.ReglagesTab })));`
  - `TabId` += `'reglages'` ; `Route.view` += `'reglages'`.
  - `parseHash` : `if (parts[0] === 'reglages') return { view: 'reglages' };`
  - `getActiveTab` : `if (route.view === 'reglages') return 'reglages';`
  - `getBreadcrumbs` early-return : ajouter `|| route.view === 'reglages'`.
  - `ALL_TABS` : étendre `requires` union avec `'crm'` déjà présent → ajouter entrée `{ id: 'reglages', labelKey: 'tabReglages', icon: '⚙️', hash: '#/reglages' }` (placée en dernier, **sans `requires`** → toujours visible ; OU `requires:'crm'` pour n'apparaître que si le CRM est actif — choisir `requires: 'crm'` pour cohérence). 
  - `getTabs` : si `requires:'crm'` réutilisé, rien à ajouter.
  - render `<main>` : `{route.view === 'reglages' && (<Suspense fallback={…}><ReglagesTab /></Suspense>)}`.

- [ ] **Step 4 : `locales.ts`** — ajouter `tabReglages: 'Réglages'` dans FR et `tabReglages: 'Settings'` dans EN (près de `tabVocaux`).

- [ ] **Step 5 : `CrmTab.tsx` lit les colonnes depuis les settings + roue ⚙️.**
  - importer `useCrmSettings` ; remplacer `const columns = (config.crm?.columns ...) || DEFAULT_COLUMNS;` par : charger `const { settings } = useCrmSettings();` et dériver `const columns: CrmColumn[] = settings.columns.map((c) => ({ status: c.id, label: c.label, hint: c.hint, dot: c.color }));` (fallback `DEFAULT_COLUMNS` si vide).
  - ajouter dans l'en-tête (près du titre) un bouton roue ⚙️ : `<button onClick={() => navigate('#/reglages')} title="Réglages des prospects" …>⚙️</button>` (importer `navigate` depuis `../CmsApp`).
  - Note : `CrmModal` reçoit déjà `columns` ; il continuera de marcher (ids = status).

- [ ] **Step 6 : build + commit**
```bash
npm run build
git add src/components/cms/crm/ProspectsSettings.tsx src/components/cms/ReglagesTab.tsx src/components/cms/CmsApp.tsx src/components/cms/locales.ts src/components/cms/crm/CrmTab.tsx
git commit -m "feat(crm): onglet Réglages + éditeur de colonnes + CrmTab lit les settings"
git fetch origin master && git rebase origin/master && git push origin master
```

---

## PHASE 2 — Toggles de champs

### Task 7 : Toggles dans Réglages + respect de la visibilité

**Files:** Modify `ProspectsSettings.tsx`, `CrmModal.tsx`, `CrmTab.tsx`

- [ ] **Step 1 : section toggles dans `ProspectsSettings.tsx`** — sous l'éditeur de colonnes, une grille de cases à cocher des champs (libellés FR) liée à `settings.fields` :
```
Structure ☑   Téléphone ☑   Email ☑   Valeur € ☑
Prochaine action ☑   Date de relance ☑   Notes ☑
SIRET client ☐   Réf. commande ☐   Facturation & vente ☑
```
Chaque case toggle la clé correspondante (`CrmFieldKey`) dans le state local ; inclus dans le `save`. (Nom/Étape non listés.)

- [ ] **Step 2 : `CrmModal` respecte les toggles.** Le modal reçoit déjà `columns` ; lui passer aussi `fields: Record<CrmFieldKey, boolean>` en prop (depuis `CrmTab` via `settings.fields`). Conditionner le rendu de chaque champ par `fields.<key> !== false` :
  - `org` → bloc Structure ; `phone`/`email` → la ligne tél/email (et masquer un seul des deux si l'autre off) ; `value` → champ Valeur estimée ; `nextAction` → Prochaine action ; `nextDate` → Date de relance ; `notes` → Notes.
  - Toujours afficher Nom + Étape (boutons de statut).
  - Importer `CrmFieldKey` depuis `./crmTypes`. Helper local `const on = (k: CrmFieldKey) => fields?.[k] !== false;`.

- [ ] **Step 3 : `CrmTab` passe `fields` au modal et masque les badges off.** À l'instanciation `<CrmModal … fields={settings.fields} />`. Sur la carte, conditionner l'aperçu : org (si `on('org')`), pastille relance (si `on('nextNdate')`… en fait toujours utile, garder), valeur (si `on('value')`), badges 📞/✉ (si `on('phone')`/`on('email')`). Garder simple : masquer seulement org/value/📞/✉ selon toggles.

- [ ] **Step 4 : build + commit**
```bash
npm run build
git add src/components/cms/crm/ProspectsSettings.tsx src/components/cms/crm/CrmModal.tsx src/components/cms/crm/CrmTab.tsx
git commit -m "feat(crm): toggles de champs (Réglages) + fiche/carte respectent la visibilité"
git fetch origin master && git rebase origin/master && git push origin master
```

---

## PHASE 3 — Capture facturation

### Task 8 : Helpers vente (purs, TDD)

**Files:** Create `src/components/cms/crm/saleHelpers.ts` + `saleHelpers.test.ts`

- [ ] **Step 1 : test (échoue)** :
```ts
import { describe, it, expect } from 'vitest';
import { parseAmount, lineTotal, saleTotal, parseLines, serializeLines } from './saleHelpers';

describe('parseAmount', () => {
  it('accepte virgule et point', () => {
    expect(parseAmount('60,00')).toBe(60);
    expect(parseAmount('60.5')).toBe(60.5);
    expect(parseAmount('1 200,50')).toBe(1200.5);
  });
  it('vide/invalide → 0', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});

describe('lineTotal', () => {
  it('qté × PU', () => {
    expect(lineTotal({ label: 'x', qty: 6, unit_price: 60 })).toBe(360);
  });
});

describe('saleTotal', () => {
  it('somme des lignes, arrondi 2 décimales', () => {
    expect(saleTotal([{ label: 'a', qty: 6, unit_price: 60 }, { label: 'b', qty: 1, unit_price: 120 }])).toBe(480);
    expect(saleTotal([{ label: 'a', qty: 3, unit_price: 10.1 }])).toBe(30.3);
  });
  it('liste vide → 0', () => {
    expect(saleTotal([])).toBe(0);
  });
});

describe('parseLines / serializeLines', () => {
  it('round-trip JSON, robuste au null/invalide', () => {
    expect(parseLines(null)).toEqual([]);
    expect(parseLines('[bad')).toEqual([]);
    const l = [{ label: 'a', qty: 2, unit_price: 5 }];
    expect(parseLines(serializeLines(l))).toEqual(l);
  });
  it('serializeLines([]) → null (pas de "[]" inutile)', () => {
    expect(serializeLines([])).toBe(null);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec** — `npm test -- saleHelpers` → FAIL.

- [ ] **Step 3 : implémenter** `src/components/cms/crm/saleHelpers.ts` :
```ts
import type { SaleLine } from './crmTypes';

export function parseAmount(s: string | number | null | undefined): number {
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  if (!s) return 0;
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export function lineTotal(l: SaleLine): number {
  return Math.round((l.qty || 0) * (l.unit_price || 0) * 100) / 100;
}

export function saleTotal(lines: SaleLine[]): number {
  return Math.round(lines.reduce((s, l) => s + lineTotal(l), 0) * 100) / 100;
}

export function parseLines(json: string | null | undefined): SaleLine[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => x && typeof x.label !== 'undefined') : [];
  } catch { return []; }
}

export function serializeLines(lines: SaleLine[]): string | null {
  const clean = lines.filter((l) => l.label && l.label.trim());
  return clean.length ? JSON.stringify(clean) : null;
}
```

- [ ] **Step 4 : lancer, vérifier le succès** — `npm test -- saleHelpers` → PASS.
- [ ] **Step 5 : commit**
```bash
git add src/components/cms/crm/saleHelpers.ts src/components/cms/crm/saleHelpers.test.ts
git commit -m "feat(crm): helpers vente (parse montant FR, totaux, JSON lignes) TDD"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 9 : API — whitelist des champs facturation

**Files:** Modify `functions/api/crm/contacts/[id].js`

- [ ] **Step 1 : étendre `EDITABLE`** — remplacer le tableau :
```js
const EDITABLE = ['name', 'org', 'phone', 'email', 'value', 'status', 'next_action', 'next_date', 'notes', 'sort'];
```
par :
```js
const EDITABLE = [
  'name', 'org', 'phone', 'email', 'value', 'status', 'next_action', 'next_date', 'notes', 'sort',
  'billing_address', 'billing_postal', 'billing_city', 'billing_contact', 'client_siret', 'order_ref', 'sale_lines', 'sale_date',
];
```
(La coercition `sort`→entier reste ; les autres bindés tels quels. `sale_lines` = string JSON.)

- [ ] **Step 2 : build + commit**
```bash
npm run build
git add "functions/api/crm/contacts/[id].js"
git commit -m "feat(crm): PATCH accepte les champs facturation (whitelist)"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 10 : Composant `SaleSection`

**Files:** Create `src/components/cms/crm/SaleSection.tsx`

- [ ] **Step 1 : écrire `SaleSection.tsx`** — section repliable autonome, contrôlée par le parent (le modal lui passe les valeurs + un `onChange`). Props :
```ts
interface SaleSectionProps {
  open: boolean;
  onToggle: () => void;
  // champs facturation (valeurs string contrôlées) + setters
  billing: { address: string; postal: string; city: string; contact: string; siret: string; orderRef: string };
  setBilling: (patch: Partial<SaleSectionProps['billing']>) => void;
  showSiret: boolean; showOrderRef: boolean;
  lines: SaleLine[];
  setLines: (lines: SaleLine[]) => void;
  saleDate: string;
  setSaleDate: (d: string) => void;
}
```
Contenu : en-tête cliquable « 💶 Facturation & vente » + chevron (open/close). Quand ouvert : champs adresse (rue, CP, ville, à l'attention de), SIRET/Réf si `showSiret`/`showOrderRef`, un tableau de lignes éditables (input désignation, input qté, input PU net ; bouton ✕ ; bouton « + ligne »), le **Total net** = `formatEuro(saleTotal(lines))` (importer `saleTotal` de `./saleHelpers`, `formatEuro` de `./crmHelpers`), et un input date. Les inputs qté/PU acceptent la virgule (au blur, `parseAmount`). Styles inline palette admin neutre. *(Code complet fourni au dispatch.)*

- [ ] **Step 2 : build + commit**
```bash
npm run build
git add src/components/cms/crm/SaleSection.tsx
git commit -m "feat(crm): SaleSection (facturation + lignes de vente, total net auto)"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 11 : Intégrer SaleSection au modal + badge carte

**Files:** Modify `CrmModal.tsx`, `CrmTab.tsx`

- [ ] **Step 1 : `CrmModal` intègre `SaleSection`** (gaté par `fields.billing`).
  - état : `billing` (6 strings depuis `contact.billing_*`/`client_siret`/`order_ref`), `lines` (`parseLines(contact.sale_lines)`), `saleDate` (`contact.sale_date || ''`), `saleOpen` (false).
  - rendu après Notes : `{on('billing') && <SaleSection open={saleOpen} onToggle={…} billing={billing} setBilling={…} showSiret={on('siret')} showOrderRef={on('orderRef')} lines={lines} setLines={setLines} saleDate={saleDate} setSaleDate={setSaleDate} />}`.
  - dans `save()`, ajouter au patch : les 6 champs billing (trim ou null), `sale_lines: serializeLines(lines)`, `sale_date: saleDate || null`, et **`value`** : `lines.length ? saleTotal(lines) : (parsedValue ?? null)` (le total des lignes prime). Importer `serializeLines`, `saleTotal` de `./saleHelpers`.

- [ ] **Step 2 : badge 💶 sur la carte (`CrmTab`)** — dans le rendu carte, si `c.sale_lines` (non vide après `parseLines`), afficher un petit badge `💶` dans `cardMeta` (à côté de la valeur). 

- [ ] **Step 3 : build + commit**
```bash
npm run build
git add src/components/cms/crm/CrmModal.tsx src/components/cms/crm/CrmTab.tsx
git commit -m "feat(crm): fiche — section facturation & vente + badge vente sur carte"
git fetch origin master && git rebase origin/master && git push origin master
```

---

### Task 12 : QA preview (contrôleur)

- [ ] Après déploiement, QA authentifiée (curl ou navigateur) :
  - `Réglages` apparaît dans la nav ; roue ⚙️ dans Prospects y mène.
  - Renommer une colonne → les cartes restent (id stable). Réordonner ↑↓ → ordre persiste (recharger). Ajouter une colonne → apparaît dans le board + le modal. Supprimer une colonne **non vide** → propose le déplacement, puis retire.
  - Toggle off « Valeur € » et « SIRET » → champs masqués dans la fiche ; toggle off « Facturation & vente » → section absente.
  - Ouvrir une fiche → déplier Facturation & vente → adresse + 2 lignes (6×60, 1×120) → Total net 480,00 € → Enregistrer → la carte affiche 480 € + badge 💶 ; recharger → persiste (D1).
  - Mobile : section repliable et réglages lisibles.
- [ ] Nettoyage : aucun `wrangler.toml` créé (`ls wrangler.toml` → absent).

---

## Self-Review (auteur)

**Couverture spec :** crm_settings store (T1/T4/T5) ✓ ; onglet Réglages + ⚙️ deux entrées (T6) ✓ ; éditeur colonnes + ids stables + suppression sûre (T6) ✓ ; toggles de champs (T7) ✓ ; capture facturation lignes net + value=total (T8/T10/T11) ✓ ; colonnes `contacts` + whitelist (T1/T9) ✓ ; badge 💶 (T11) ✓ ; défauts si settings absents (T3/T5) ✓ ; non-goals respectés (pas de form-builder, pas de génération doc, pas de multi-ventes).

**Placeholders :** les 2 gros composants (ProspectsSettings T6, SaleSection T10) ont un blueprint précis (props, comportements, handlers, palette) ; le code intégral est assemblé au dispatch (cohérent avec l'exécution v1). Aucun « TODO » dans le code livré.

**Cohérence types :** `CrmSettings{columns:CrmColumn?,fields}` — attention : `crmSettings.ts` colonnes = `{id,label,hint,color}` (≠ `CrmColumn` du board `{status,label,hint,dot}`). Conversion explicite dans CrmTab (T6 step 5 : `id→status`, `color→dot`). `SaleLine{label,qty,unit_price}` cohérent T2/T8/T10/T11. `CrmFieldKey` cohérent T2/T3/T7. `value`=total cohérent T11. Endpoints `/api/crm/settings` cohérents T4/T5.

**Résolu inline :** `CrmSettings.columns` utilise `CrmSettingsColumn {id,label,hint,color}` (défini en T2), distinct de `CrmColumn {status,label,hint,dot}` du board ; la conversion `id→status`/`color→dot` se fait dans CrmTab (T6 step 5).
