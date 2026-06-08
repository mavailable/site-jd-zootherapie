# Onglet "Prospects" (mini-CRM D1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au panel `/admin` de jd-zoo un onglet "Prospects" : un kanban privé (6 colonnes Nouveau→Perdu) pour suivre ses prospects/clients, avec carte CRM légère (contact, valeur, prochaine action + date de relance) et un bandeau "à relancer" en tête. Données en Cloudflare D1.

**Architecture:** Composant React `CrmTab` (scaffold repris du `BoardTab` éprouvé de les-tagaloa, reskin palette admin neutre jd-zoo) + bandeau relances + persistance D1 via Pages Functions CRUD gatées par l'auth CMS existante (cookie HMAC). Une base D1 par client. Feature générique gatée par `cmsConfig.crm?.enabled`, portable au parc. jd-zoo = pilote.

**Tech Stack:** Astro v5 (`output: 'static'`) + React islands, Cloudflare Pages Functions, Cloudflare D1 (SQLite), vitest (tests unitaires des helpers purs), Web Crypto auth helpers existants.

**Spec de référence :** `docs/superpowers/specs/2026-06-08-crm-clients-design.md`

**Conventions repo (CLAUDE.md) :** FR partout, branche `master`, commit + push à chaque tâche. jd-zoo : `/admin` commite direct sur remote master → **toujours `git fetch origin master` + rebase avant push** (le local est souvent derrière).

---

## File Structure

**Créés :**
- `schema.sql` — DDL table `contacts` + index + 3 cartes seed.
- `functions/api/crm/contacts.js` — `onRequestGet` (liste) + `onRequestPost` (création). Gatées auth + origin. D1.
- `functions/api/crm/contacts/[id].js` — `onRequestPatch` (édition/déplacement) + `onRequestDelete`. Gatées auth + origin. D1.
- `src/components/cms/crm/crmTypes.ts` — types `Contact`, `CrmColumn`, `RelanceKind`.
- `src/components/cms/crm/crmHelpers.ts` — fonctions pures (relance, tri, format €). **Cœur testé.**
- `src/components/cms/crm/crmHelpers.test.ts` — tests vitest des helpers.
- `src/components/cms/crm/useCrm.ts` — hook client API D1 (list/create/update/remove).
- `src/components/cms/crm/CrmModal.tsx` — modal détail/édition d'une carte.
- `src/components/cms/crm/CrmTab.tsx` — board : header, ajout rapide, bandeau relances, colonnes, cartes.

**Modifiés :**
- `cms.types.ts` — ajoute `CmsCrmConfig` + `crm?` sur `CmsConfig`.
- `cms.config.ts` — ajoute le bloc `crm` (6 colonnes).
- `src/components/cms/locales.ts` — ajoute la clé `tabCrm` (FR + EN).
- `src/components/cms/CmsApp.tsx` — câble l'onglet (lazy import, TabId, Route, parseHash, getActiveTab, ALL_TABS, getTabs, render switch).

**Infra (Task 8, hors fichiers) :** base D1 `jdzoo-crm` + binding `DB` sur le projet CF Pages **via dashboard/API CF — PAS de `wrangler.toml`** (jd-zoo n'en a aucun ; en créer un ferait sauter les bindings KV `CMS_AUTH` / R2 vocaux configurés au dashboard).

---

## Task 1 : Schéma D1 `contacts`

**Files:**
- Create: `schema.sql`

- [ ] **Step 1: Écrire `schema.sql`**

```sql
-- Mini-CRM "Prospects" — table unique par site client.
-- Appliqué sur la base D1 du projet (jdzoo-crm). Données privées (jamais servies publiquement).
CREATE TABLE IF NOT EXISTS contacts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  org         TEXT,
  phone       TEXT,
  email       TEXT,
  value       REAL,
  status      TEXT NOT NULL DEFAULT 'nouveau',
  next_action TEXT,
  next_date   TEXT,            -- date de relance, format 'YYYY-MM-DD'
  notes       TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_next_date ON contacts(next_date);

-- Cartes d'exemple (la cliente les supprime). Marquées "(exemple)" sans ambiguïté.
INSERT INTO contacts (name, org, phone, email, value, status, next_action, next_date, notes, sort) VALUES
  ('Mme Durand (exemple)', NULL, '06 12 34 56 78', NULL, 60, 'rdv', 'Confirmer la séance découverte', date('now','+1 day'), 'Intéressée par une séance pour son fils. Exemple — à supprimer.', 0),
  ('EHPAD Les Tilleuls (exemple)', 'EHPAD Les Tilleuls', NULL, 'direction@example.org', 480, 'devis', 'Relancer après envoi du devis', date('now','-2 day'), 'Devis envoyé pour des ateliers mensuels. Exemple — à supprimer.', 0),
  ('École Jean Moulin (exemple)', 'École Jean Moulin', NULL, NULL, NULL, 'nouveau', 'Premier contact à prendre', NULL, 'Piste repérée sur un salon. Exemple — à supprimer.', 0);
```

- [ ] **Step 2: Vérifier la validité SQL en local**

Run: `npx wrangler d1 execute jdzoo-crm --local --file=./schema.sql`
Expected: crée une base D1 locale `.wrangler/state/...`, applique sans erreur (3 lignes insérées). Si `jdzoo-crm` n'existe pas localement wrangler la crée à la volée pour `--local`.

> Si `wrangler` indique qu'il faut un binding configuré : ignorer, `--local --file` n'exige pas de binding distant. En cas d'erreur de syntaxe, corriger le `.sql` et relancer.

- [ ] **Step 3: Commit**

```bash
git fetch origin master && git rebase origin/master
git add schema.sql
git commit -m "feat(crm): schéma D1 table contacts + seed exemples"
git push origin master
```

---

## Task 2 : Helpers purs (relance, tri, format) — TDD

**Files:**
- Create: `src/components/cms/crm/crmTypes.ts`
- Create: `src/components/cms/crm/crmHelpers.ts`
- Test: `src/components/cms/crm/crmHelpers.test.ts`

- [ ] **Step 1: Écrire les types**

`src/components/cms/crm/crmTypes.ts` :

```ts
// Types du mini-CRM "Prospects". Partagés composant + helpers.

export interface Contact {
  id: number;
  name: string;
  org?: string | null;
  phone?: string | null;
  email?: string | null;
  value?: number | null;
  status: string;
  next_action?: string | null;
  next_date?: string | null; // 'YYYY-MM-DD'
  notes?: string | null;
  sort: number;
  created_at?: string;
  updated_at?: string;
}

// Champs éditables envoyés à l'API (PATCH/POST). Pas d'id/created_at/updated_at.
export type ContactPatch = Partial<
  Pick<Contact, 'name' | 'org' | 'phone' | 'email' | 'value' | 'status' | 'next_action' | 'next_date' | 'notes' | 'sort'>
>;

export interface CrmColumn {
  status: string;
  label: string;
  hint: string;
  dot: string; // couleur du point d'en-tête
}

export type RelanceKind = 'overdue' | 'today' | 'soon' | 'later' | 'none';

export interface Relance {
  kind: RelanceKind;
  days: number | null; // overdue: nb de jours de retard (positif) ; today: 0 ; soon/later: J+days
}
```

- [ ] **Step 2: Écrire le test (qui échoue)**

`src/components/cms/crm/crmHelpers.test.ts` :

```ts
import { describe, it, expect } from 'vitest';
import { daysBetween, todayParisISO, relance, isDue, urgencyRank } from './crmHelpers';

describe('daysBetween', () => {
  it('compte les jours entiers entre deux dates ISO', () => {
    expect(daysBetween('2026-06-08', '2026-06-08')).toBe(0);
    expect(daysBetween('2026-06-08', '2026-06-10')).toBe(2);
    expect(daysBetween('2026-06-10', '2026-06-08')).toBe(-2);
  });
  it('traverse correctement un changement de mois', () => {
    expect(daysBetween('2026-06-30', '2026-07-01')).toBe(1);
  });
});

describe('todayParisISO', () => {
  it('rend la date du jour à Paris (CEST +2 en été)', () => {
    // 01:00 UTC = 03:00 Paris → 8 juin
    expect(todayParisISO(new Date('2026-06-08T01:00:00Z'))).toBe('2026-06-08');
  });
  it('bascule au lendemain quand Paris a déjà changé de jour', () => {
    // 23:30 UTC = 01:30 Paris le 8 → 8 juin
    expect(todayParisISO(new Date('2026-06-07T23:30:00Z'))).toBe('2026-06-08');
  });
});

describe('relance', () => {
  const today = '2026-06-08';
  it('none si pas de date', () => {
    expect(relance(null, today)).toEqual({ kind: 'none', days: null });
    expect(relance('', today)).toEqual({ kind: 'none', days: null });
  });
  it('overdue avec nb de jours de retard positif', () => {
    expect(relance('2026-06-06', today)).toEqual({ kind: 'overdue', days: 2 });
  });
  it('today', () => {
    expect(relance('2026-06-08', today)).toEqual({ kind: 'today', days: 0 });
  });
  it('soon pour J+1 et J+2', () => {
    expect(relance('2026-06-09', today)).toEqual({ kind: 'soon', days: 1 });
    expect(relance('2026-06-10', today)).toEqual({ kind: 'soon', days: 2 });
  });
  it('later au-delà de J+2', () => {
    expect(relance('2026-06-12', today)).toEqual({ kind: 'later', days: 4 });
  });
});

describe('isDue (entre dans le bandeau)', () => {
  it('vrai pour overdue/today/soon, faux sinon', () => {
    expect(isDue({ kind: 'overdue', days: 1 })).toBe(true);
    expect(isDue({ kind: 'today', days: 0 })).toBe(true);
    expect(isDue({ kind: 'soon', days: 2 })).toBe(true);
    expect(isDue({ kind: 'later', days: 5 })).toBe(false);
    expect(isDue({ kind: 'none', days: null })).toBe(false);
  });
});

describe('urgencyRank (tri du bandeau et des colonnes)', () => {
  it('overdue < today < soon < later < none, et plus urgent en premier', () => {
    const r = (k: 'overdue' | 'today' | 'soon' | 'later' | 'none', d: number | null) =>
      urgencyRank({ kind: k, days: d });
    expect(r('overdue', 3)).toBeLessThan(r('overdue', 1)); // 3j de retard avant 1j
    expect(r('overdue', 1)).toBeLessThan(r('today', 0));
    expect(r('today', 0)).toBeLessThan(r('soon', 1));
    expect(r('soon', 1)).toBeLessThan(r('soon', 2));
    expect(r('soon', 2)).toBeLessThan(r('later', 4));
    expect(r('later', 4)).toBeLessThan(r('none', null));
  });
});
```

- [ ] **Step 3: Lancer le test, vérifier l'échec**

Run: `npm test -- crmHelpers`
Expected: FAIL — `crmHelpers.ts` n'existe pas / fonctions non définies.

- [ ] **Step 4: Implémenter les helpers**

`src/components/cms/crm/crmHelpers.ts` :

```ts
import type { Relance, RelanceKind, Contact } from './crmTypes';

// Nombre de jours entiers de `fromISO` à `toISO` (dates 'YYYY-MM-DD', UTC midnight).
export function daysBetween(fromISO: string, toISO: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((p(toISO) - p(fromISO)) / 86400000);
}

// Date du jour 'YYYY-MM-DD' dans le fuseau Europe/Paris.
export function todayParisISO(now: Date = new Date()): string {
  // en-CA → 'YYYY-MM-DD'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

// État de relance d'une carte par rapport à aujourd'hui.
export function relance(nextDate: string | null | undefined, todayISO: string): Relance {
  if (!nextDate) return { kind: 'none', days: null };
  const diff = daysBetween(todayISO, nextDate);
  if (diff < 0) return { kind: 'overdue', days: -diff };
  if (diff === 0) return { kind: 'today', days: 0 };
  if (diff <= 2) return { kind: 'soon', days: diff };
  return { kind: 'later', days: diff };
}

// La carte apparaît-elle dans le bandeau "À relancer" ?
export function isDue(r: Relance): boolean {
  return r.kind === 'overdue' || r.kind === 'today' || r.kind === 'soon';
}

// Clé de tri : plus c'est urgent, plus c'est petit (remonte en haut).
// overdue (retard décroissant) < today < soon (proche d'abord) < later < none.
const KIND_BASE: Record<RelanceKind, number> = {
  overdue: 0,
  today: 1000,
  soon: 2000,
  later: 3000,
  none: 9000,
};
export function urgencyRank(r: Relance): number {
  if (r.kind === 'overdue') return KIND_BASE.overdue - (r.days ?? 0); // plus de retard → rang plus petit
  if (r.kind === 'soon' || r.kind === 'later') return KIND_BASE[r.kind] + (r.days ?? 0);
  return KIND_BASE[r.kind];
}

// Tri d'une colonne : cartes dues en haut (par urgence), puis par `sort` puis id.
export function sortColumn(cards: Contact[], todayISO: string): Contact[] {
  return [...cards].sort((a, b) => {
    const ra = urgencyRank(relance(a.next_date, todayISO));
    const rb = urgencyRank(relance(b.next_date, todayISO));
    if (ra !== rb) return ra - rb;
    if (a.sort !== b.sort) return a.sort - b.sort;
    return a.id - b.id;
  });
}

// Format monétaire FR compact : 490 → "490 €", null → "".
export function formatEuro(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return `${new Intl.NumberFormat('fr-FR').format(value)} €`;
}
```

- [ ] **Step 5: Lancer le test, vérifier le succès**

Run: `npm test -- crmHelpers`
Expected: PASS (tous les `describe` verts).

- [ ] **Step 6: Commit**

```bash
git fetch origin master && git rebase origin/master
git add src/components/cms/crm/crmTypes.ts src/components/cms/crm/crmHelpers.ts src/components/cms/crm/crmHelpers.test.ts
git commit -m "feat(crm): types + helpers purs relance/tri/format (TDD)"
git push origin master
```

---

## Task 3 : API Functions CRUD (D1)

**Files:**
- Create: `functions/api/crm/contacts.js`
- Create: `functions/api/crm/contacts/[id].js`

**Pattern auth (réutilise l'existant) :** chaque handler appelle `requireAuth(request, env)` (throw une Response 401 si pas de cookie HMAC valide) ; les mutations vérifient en plus `checkOrigin(request)` (anti-CSRF). Helpers : `functions/api/cms/_auth-helpers.js`. Binding D1 : `env.DB`.

- [ ] **Step 1: Écrire `functions/api/crm/contacts.js` (liste + création)**

```js
// /api/crm/contacts — GET (liste) | POST (création). Mini-CRM "Prospects" (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../cms/_auth-helpers.js';

const STATUSES = ['nouveau', 'contacte', 'rdv', 'devis', 'gagne', 'perdu'];

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestGet({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!env.DB) return bad('Base de données non configurée', 500);
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM contacts ORDER BY sort ASC, id ASC'
    ).all();
    return new Response(JSON.stringify({ contacts: results || [] }), {
      status: 200,
      headers: jsonHeaders(),
    });
  } catch (err) {
    return bad('Erreur lecture contacts', 500);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('JSON invalide');
  }

  const name = (body.name || '').toString().trim();
  if (!name) return bad('Le nom est obligatoire');
  const status = STATUSES.includes(body.status) ? body.status : 'nouveau';

  try {
    const row = await env.DB.prepare(
      `INSERT INTO contacts (name, org, phone, email, value, status, next_action, next_date, notes, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING *`
    )
      .bind(
        name,
        body.org ?? null,
        body.phone ?? null,
        body.email ?? null,
        body.value ?? null,
        status,
        body.next_action ?? null,
        body.next_date ?? null,
        body.notes ?? null,
        Number.isInteger(body.sort) ? body.sort : 0
      )
      .first();
    return new Response(JSON.stringify({ contact: row }), { status: 201, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur création contact', 500);
  }
}
```

- [ ] **Step 2: Écrire `functions/api/crm/contacts/[id].js` (édition + suppression)**

```js
// /api/crm/contacts/:id — PATCH (édition/déplacement) | DELETE. Mini-CRM "Prospects" (D1).
import { requireAuth, checkOrigin, jsonHeaders } from '../../cms/_auth-helpers.js';

const STATUSES = ['nouveau', 'contacte', 'rdv', 'devis', 'gagne', 'perdu'];
// Champs éditables (whitelist stricte → requête paramétrée sûre).
const EDITABLE = ['name', 'org', 'phone', 'email', 'value', 'status', 'next_action', 'next_date', 'notes', 'sort'];

function bad(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), { status, headers: jsonHeaders() });
}

export async function onRequestPatch({ request, env, params }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return bad('Identifiant invalide');

  let body;
  try {
    body = await request.json();
  } catch {
    return bad('JSON invalide');
  }
  if (body.status !== undefined && !STATUSES.includes(body.status)) {
    return bad('Statut invalide');
  }

  const sets = [];
  const values = [];
  for (const key of EDITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      sets.push(`${key} = ?`);
      values.push(body[key]);
    }
  }
  if (sets.length === 0) return bad('Aucun champ à modifier');
  sets.push(`updated_at = datetime('now')`);

  try {
    const row = await env.DB.prepare(
      `UPDATE contacts SET ${sets.join(', ')} WHERE id = ? RETURNING *`
    )
      .bind(...values, id)
      .first();
    if (!row) return bad('Contact introuvable', 404);
    return new Response(JSON.stringify({ contact: row }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur mise à jour contact', 500);
  }
}

export async function onRequestDelete({ request, env, params }) {
  try {
    await requireAuth(request, env);
  } catch (response) {
    return response;
  }
  if (!checkOrigin(request)) return bad('Origine non autorisée', 403);
  if (!env.DB) return bad('Base de données non configurée', 500);

  const id = parseInt(params.id, 10);
  if (Number.isNaN(id)) return bad('Identifiant invalide');

  try {
    await env.DB.prepare('DELETE FROM contacts WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: jsonHeaders() });
  } catch (err) {
    return bad('Erreur suppression contact', 500);
  }
}
```

- [ ] **Step 3: Tester les Functions en local contre D1 local**

Build d'abord (les Functions servent depuis `dist/`), puis `wrangler pages dev` avec un binding D1 local (pas de wrangler.toml → flag CLI) :

```bash
npm run build
npx wrangler pages dev dist --d1 DB=jdzoo-crm --compatibility-date=2024-11-01
```

Dans un autre terminal, appliquer le schéma sur la D1 **locale** puis tester sans cookie (doit refuser) :

```bash
npx wrangler d1 execute jdzoo-crm --local --file=./schema.sql
curl -s -i http://localhost:8788/api/crm/contacts | head -1
```
Expected: `HTTP/1.1 401` (pas authentifié → la gate marche). Le test du chemin authentifié se fera en QA sur preview (Task 8) où le cookie de session existe.

> Note : `wrangler pages dev` local ne partage pas le cookie HMAC de prod ; on valide ici que (a) la route répond, (b) la gate 401 fonctionne, (c) aucune erreur 500 de binding (`env.DB` présent). Le CRUD complet authentifié est validé en preview.

- [ ] **Step 4: Commit**

```bash
git fetch origin master && git rebase origin/master
git add functions/api/crm/contacts.js functions/api/crm/contacts/[id].js
git commit -m "feat(crm): API Functions D1 CRUD contacts (auth + origin gated)"
git push origin master
```

---

## Task 4 : Hook client `useCrm`

**Files:**
- Create: `src/components/cms/crm/useCrm.ts`

- [ ] **Step 1: Écrire le hook**

`src/components/cms/crm/useCrm.ts` :

```ts
import { useState, useEffect, useCallback } from 'react';
import type { Contact, ContactPatch } from './crmTypes';

const BASE = '/api/crm/contacts';

async function jsonOrThrow(res: Response) {
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* corps vide */
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Erreur ${res.status}`);
  }
  return data;
}

// Charge la liste et expose les mutations. Chaque mutation rafraîchit le state local
// à partir de la ligne renvoyée par l'API (source de vérité = D1).
export function useCrm() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await jsonOrThrow(await fetch(BASE, { credentials: 'same-origin' }));
      setContacts((data.contacts as Contact[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async (patch: ContactPatch): Promise<Contact> => {
    const data = await jsonOrThrow(
      await fetch(BASE, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    );
    const created = data.contact as Contact;
    setContacts((prev) => [...prev, created]);
    return created;
  }, []);

  const update = useCallback(async (id: number, patch: ContactPatch): Promise<Contact> => {
    const data = await jsonOrThrow(
      await fetch(`${BASE}/${id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    );
    const updated = data.contact as Contact;
    setContacts((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const remove = useCallback(async (id: number): Promise<void> => {
    await jsonOrThrow(
      await fetch(`${BASE}/${id}`, { method: 'DELETE', credentials: 'same-origin' })
    );
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { contacts, loading, error, reload: load, create, update, remove };
}
```

- [ ] **Step 2: Vérifier la compilation TypeScript**

Run: `npx astro check --minimumSeverity error 2>&1 | tail -5` (ou `npm run build` si `astro check` indisponible)
Expected: aucune erreur de type sur `useCrm.ts` (les composants qui l'utilisent n'existent pas encore — c'est normal).

- [ ] **Step 3: Commit**

```bash
git fetch origin master && git rebase origin/master
git add src/components/cms/crm/useCrm.ts
git commit -m "feat(crm): hook useCrm (client API D1)"
git push origin master
```

---

## Task 5 : Composant `CrmModal`

**Files:**
- Create: `src/components/cms/crm/CrmModal.tsx`
- Référence scaffold (à copier) : `projets/les-tagaloa/src/components/cms/BoardTab.tsx` → fonction `BoardModal` (lignes ~396-777) : overlay, focus-trap clavier (Échap, Tab), blocage scroll body, mini-boîte de confirmation de suppression. **Reprendre ce squelette tel quel**, puis remplacer le corps des champs par ceux ci-dessous et la palette par celle de jd-zoo (admin neutre).

**Palette admin jd-zoo (constantes en tête de fichier) :**
```ts
const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626', SUCCESS = '#16a34a';
```

- [ ] **Step 1: Écrire `CrmModal.tsx`**

Props et structure :

```tsx
import { useState, useEffect, useRef } from 'react';
import type { Contact, ContactPatch, CrmColumn } from './crmTypes';
import { formatEuro } from './crmHelpers';

interface CrmModalProps {
  contact: Contact;
  columns: CrmColumn[];
  busy: boolean;
  onClose: () => void;
  onSave: (id: number, patch: ContactPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function CrmModal({ contact, columns, busy, onClose, onSave, onDelete }: CrmModalProps) {
  const [name, setName] = useState(contact.name);
  const [org, setOrg] = useState(contact.org || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');
  const [value, setValue] = useState<string>(contact.value != null ? String(contact.value) : '');
  const [status, setStatus] = useState(contact.status);
  const [nextAction, setNextAction] = useState(contact.next_action || '');
  const [nextDate, setNextDate] = useState(contact.next_date || '');
  const [notes, setNotes] = useState(contact.notes || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const confirmDeleteRef = useRef(false);

  // ── Focus-trap + Échap + blocage scroll : COPIER le useEffect de BoardModal (identique). ──
  // (voir BoardTab.tsx lignes ~436-481 ; remplacer setConfirmDelete logic identique)

  const working = saving || busy;

  const save = async () => {
    setSaving(true);
    try {
      const parsedValue = value.trim() === '' ? null : Number(value.replace(',', '.'));
      await onSave(contact.id, {
        name: name.trim() || contact.name,
        org: org.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        value: parsedValue != null && Number.isNaN(parsedValue) ? null : parsedValue,
        status,
        next_action: nextAction.trim() || null,
        next_date: nextDate || null,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={overlayRef} style={styles.overlay} className="crm-overlay"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Fiche prospect"
        style={styles.modal} className="crm-modal">

        <div style={styles.head}>
          <span style={styles.eyebrow}>Fiche prospect</span>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Fermer">×</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label} htmlFor="crm-name">Nom *</label>
          <input id="crm-name" ref={firstFieldRef} value={name} onChange={(e) => setName(e.target.value)}
            style={styles.input} placeholder="Nom du prospect ou de la structure" />

          <label style={styles.label} htmlFor="crm-org">Structure (optionnel)</label>
          <input id="crm-org" value={org} onChange={(e) => setOrg(e.target.value)}
            style={styles.input} placeholder="EHPAD, école, entreprise…" />

          <div style={styles.row2}>
            <div style={styles.col}>
              <label style={styles.label} htmlFor="crm-phone">Téléphone</label>
              <input id="crm-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                style={styles.input} inputMode="tel" placeholder="06…" />
            </div>
            <div style={styles.col}>
              <label style={styles.label} htmlFor="crm-email">Email</label>
              <input id="crm-email" value={email} onChange={(e) => setEmail(e.target.value)}
                style={styles.input} inputMode="email" placeholder="nom@exemple.fr" />
            </div>
          </div>

          <label style={styles.label} htmlFor="crm-value">Valeur estimée (€)</label>
          <input id="crm-value" value={value} onChange={(e) => setValue(e.target.value)}
            style={styles.input} inputMode="decimal" placeholder="ex. 490" />

          <span style={styles.label}>Étape</span>
          <div style={styles.statusRow} role="group" aria-label="Étape">
            {columns.map((c) => {
              const active = status === c.status;
              return (
                <button key={c.status} type="button" onClick={() => setStatus(c.status)}
                  aria-pressed={active}
                  style={{ ...styles.statusBtn, ...(active ? styles.statusBtnActive : {}) }}>
                  <span style={{ ...styles.statusDot, background: c.dot }} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <label style={styles.label} htmlFor="crm-action">Prochaine action</label>
          <input id="crm-action" value={nextAction} onChange={(e) => setNextAction(e.target.value)}
            style={styles.input} placeholder="ex. Renvoyer le devis" />

          <label style={styles.label} htmlFor="crm-date">Date de relance</label>
          <input id="crm-date" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
            style={styles.input} />

          <label style={styles.label} htmlFor="crm-notes">Notes</label>
          <textarea id="crm-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={4} style={styles.textarea} placeholder="Contexte, historique, points à retenir…" />
        </div>

        <div style={styles.foot}>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={working}
            style={styles.deleteBtn}>✕ Supprimer</button>
          <div style={styles.footRight}>
            <button type="button" onClick={onClose} disabled={working} style={styles.cancelBtn}>Fermer</button>
            <button type="button" onClick={save} disabled={working || !name.trim()}
              style={styles.saveBtn}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>

        {/* Mini-boîte de confirmation : COPIER le bloc confirmDelete de BoardModal (BoardTab.tsx ~731-773),
            textes FR : titre "Supprimer ce prospect ?", desc "Cette action est définitive.",
            bouton "Supprimer" → onDelete(contact.id), "Annuler" → setConfirmDelete(false). */}
        {confirmDelete && (
          <div style={styles.confirmOverlay}>{/* … cf. BoardModal … */}</div>
        )}
      </div>
    </div>
  );
}
```

> **Styles `const styles`** : reprendre les objets de style de `BoardModal` (overlay, modal, head, eyebrow, closeBtn, body, label, input, textarea, statusRow, statusBtn, statusBtnActive, statusDot, foot, footRight, deleteBtn, cancelBtn, saveBtn, confirmOverlay, confirmBox…) en substituant la palette deep-sea par la palette jd-zoo ci-dessus (`ACCENT` à la place de `TEAL`, `INK/MUTED/LINE/PAPER` à la place des tokens Les). Ajouter `row2` (`display:flex; gap:0.6rem`) et `col` (`flex:1; minWidth:0`) pour la ligne téléphone/email.

- [ ] **Step 2: Vérifier la compilation**

Run: `npx astro check --minimumSeverity error 2>&1 | tail -5`
Expected: pas d'erreur de type sur `CrmModal.tsx` (le focus-trap useEffect et le bloc confirmDelete doivent être complétés depuis BoardModal — vérifier qu'aucune ref/handler n'est laissé indéfini).

- [ ] **Step 3: Commit**

```bash
git fetch origin master && git rebase origin/master
git add src/components/cms/crm/CrmModal.tsx
git commit -m "feat(crm): CrmModal (fiche prospect structurée)"
git push origin master
```

---

## Task 6 : Composant `CrmTab` (board + bandeau relances)

**Files:**
- Create: `src/components/cms/crm/CrmTab.tsx`
- Référence scaffold (à copier) : `projets/les-tagaloa/src/components/cms/BoardTab.tsx` → fonction `BoardTab` (lignes ~67-379) : colonnes, `byStatus`, déplacement par flèches ← → (NEXT/PREV dérivés de l'ordre des colonnes), carte cliquable, confirmation de suppression inline. **Reprendre ce squelette**, brancher la persistance sur `useCrm` (au lieu de fetchFile/saveFile), enrichir la carte, ajouter le bandeau.

- [ ] **Step 1: Écrire `CrmTab.tsx` — en-tête, données, navigation colonnes**

```tsx
import { useState, useMemo } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useCrm } from './useCrm';
import { CrmModal } from './CrmModal';
import { relance, isDue, urgencyRank, sortColumn, formatEuro, todayParisISO } from './crmHelpers';
import type { Contact, CrmColumn } from './crmTypes';

// Palette admin jd-zoo
const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626';

const DEFAULT_COLUMNS: CrmColumn[] = [
  { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
  { status: 'contacte', label: 'Contacté', hint: 'Premier contact', dot: '#3b82f6' },
  { status: 'rdv', label: 'RDV / échange', hint: 'En discussion', dot: '#0ea5e9' },
  { status: 'devis', label: 'Devis envoyé', hint: 'Proposition faite', dot: '#f59e0b' },
  { status: 'gagne', label: 'Gagné', hint: 'Conclu ✅', dot: '#16a34a' },
  { status: 'perdu', label: 'Perdu', hint: 'Sans suite', dot: '#cbd5e1' },
];

export function CrmTab({ config }: { config: CmsConfig }) {
  const columns = (config.crm?.columns as CrmColumn[]) || DEFAULT_COLUMNS;
  const { contacts, loading, error, reload, create, update, remove } = useCrm();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const today = todayParisISO();

  // Tables de navigation linéaire dérivées de l'ordre des colonnes.
  const order = columns.map((c) => c.status);
  const NEXT: Record<string, string | null> = Object.fromEntries(
    order.map((s, i) => [s, i < order.length - 1 ? order[i + 1] : null])
  );
  const PREV: Record<string, string | null> = Object.fromEntries(
    order.map((s, i) => [s, i > 0 ? order[i - 1] : null])
  );
  const firstStatus = order[0];

  const dueList = useMemo(
    () =>
      contacts
        .filter((c) => isDue(relance(c.next_date, today)))
        .sort((a, b) => urgencyRank(relance(a.next_date, today)) - urgencyRank(relance(b.next_date, today))),
    [contacts, today]
  );

  const byStatus = (status: string) => sortColumn(contacts.filter((c) => c.status === status), today);
  const openContact = openId != null ? contacts.find((c) => c.id === openId) || null : null;

  const addContact = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      setNewName('');
      await create({ name, status: firstStatus });
    } finally {
      setBusy(false);
    }
  };

  const move = async (c: Contact, dir: 'next' | 'prev') => {
    if (busy) return;
    const target = dir === 'next' ? NEXT[c.status] : PREV[c.status];
    if (!target) return;
    setBusy(true);
    try {
      await update(c.id, { status: target });
    } finally {
      setBusy(false);
    }
  };

  const saveContact = async (id: number, patch: Parameters<typeof update>[1]) => {
    setBusy(true);
    try {
      await update(id, patch);
    } finally {
      setBusy(false);
    }
  };

  const deleteContact = async (id: number) => {
    setBusy(true);
    try {
      await remove(id);
      if (openId === id) setOpenId(null);
    } finally {
      setBusy(false);
    }
  };

  // … (suite : rendu, Step 2)
```

- [ ] **Step 2: Écrire le rendu — header, ajout, bandeau, colonnes, cartes, modal**

```tsx
  return (
    <div style={styles.shell} className="crm-tab">
      <CrmStyles />

      <header style={styles.intro}>
        <p style={styles.eyebrow}>Suivi commercial</p>
        <h1 style={styles.title}>Prospects</h1>
        <p style={styles.lede}>
          Suis tes prospects et clients du premier contact jusqu'à la signature. Ajoute une fiche,
          fais-la avancer d'étape avec les flèches, et note une date de relance pour ne rien oublier.
        </p>
      </header>

      <div style={styles.addBar}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addContact(); }}
          placeholder="Ajouter un prospect (nom) et appuyer sur Entrée…"
          style={styles.addInput} disabled={busy} aria-label="Nouveau prospect" />
        <button type="button" onClick={addContact} disabled={busy || !newName.trim()}
          style={{ ...styles.addBtn, ...(busy || !newName.trim() ? styles.addBtnDisabled : {}) }}>
          Ajouter
        </button>
      </div>

      {/* Bandeau relances */}
      {!loading && !error && (
        <div style={styles.banner}>
          {dueList.length === 0 ? (
            <p style={styles.bannerEmpty}>Rien à relancer aujourd'hui ✅</p>
          ) : (
            <>
              <p style={styles.bannerTitle}>🔔 À relancer ({dueList.length})</p>
              <ul style={styles.bannerList}>
                {dueList.map((c) => {
                  const r = relance(c.next_date, today);
                  const tag =
                    r.kind === 'overdue' ? `en retard (${r.days}j)` :
                    r.kind === 'today' ? "aujourd'hui" : `dans ${r.days}j`;
                  const color = r.kind === 'overdue' ? DANGER : r.kind === 'today' ? '#b45309' : ACCENT;
                  return (
                    <li key={c.id}>
                      <button type="button" style={styles.bannerItem} onClick={() => setOpenId(c.id)}>
                        <span style={styles.bannerName}>{c.name}</span>
                        <span style={{ ...styles.bannerTag, color }}>{tag}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {loading && <div style={styles.loadingBox}>Chargement…</div>}
      {error && !loading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={reload} style={styles.retryBtn}>Réessayer</button>
        </div>
      )}

      {!loading && !error && (
        <div style={styles.board}>
          {columns.map((col) => {
            const list = byStatus(col.status);
            return (
              <section key={col.status} style={styles.column} aria-label={col.label}>
                <div style={styles.colHead}>
                  <span style={{ ...styles.colDot, background: col.dot }} />
                  <h2 style={styles.colTitle}>{col.label}</h2>
                  <span style={styles.colCount}>{list.length}</span>
                </div>
                <p style={styles.colHint}>{col.hint}</p>
                <div style={styles.cards}>
                  {list.length === 0 && <p style={styles.empty}>Vide pour l'instant.</p>}
                  {list.map((c) => {
                    const r = relance(c.next_date, today);
                    const pastille =
                      r.kind === 'overdue' ? { txt: `⚠ Relance en retard (${r.days}j)`, col: DANGER } :
                      r.kind === 'today' ? { txt: "⏰ Relance aujourd'hui", col: '#b45309' } :
                      r.kind === 'soon' ? { txt: `📅 Relance dans ${r.days}j`, col: ACCENT } :
                      r.kind === 'later' && c.next_date ? { txt: `📅 ${c.next_date}`, col: MUTED } : null;
                    return (
                      <article key={c.id} style={styles.card} className="crm-card" role="button"
                        tabIndex={0} aria-label={`Ouvrir ${c.name}`}
                        onClick={() => setOpenId(c.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(c.id); } }}>
                        <p style={styles.cardName}>{c.name}</p>
                        {c.org && <p style={styles.cardOrg}>{c.org}</p>}
                        {pastille && <p style={{ ...styles.cardRelance, color: pastille.col }}>{pastille.txt}</p>}
                        {c.next_action && <p style={styles.cardAction}>➡ {c.next_action}</p>}
                        <div style={styles.cardMeta}>
                          {c.value != null && <span style={styles.cardValue}>{formatEuro(c.value)}</span>}
                          {c.phone && <span style={styles.cardBadge} title={c.phone}>📞</span>}
                          {c.email && <span style={styles.cardBadge} title={c.email}>✉</span>}
                        </div>
                        <div style={styles.cardActions}>
                          <button type="button" className="move-btn"
                            onClick={(e) => { e.stopPropagation(); move(c, 'prev'); }}
                            disabled={busy || !PREV[c.status]}
                            style={{ ...styles.moveBtn, ...(!PREV[c.status] ? styles.moveHidden : {}) }}
                            aria-label="Étape précédente">←</button>
                          <button type="button" className="move-btn"
                            onClick={(e) => { e.stopPropagation(); move(c, 'next'); }}
                            disabled={busy || !NEXT[c.status]}
                            style={{ ...styles.moveBtn, ...(!NEXT[c.status] ? styles.moveHidden : {}) }}
                            aria-label="Étape suivante">→</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {busy && <p style={styles.savingNote}>Enregistrement…</p>}

      {openContact && (
        <CrmModal key={openContact.id} contact={openContact} columns={columns} busy={busy}
          onClose={() => setOpenId(null)} onSave={saveContact} onDelete={deleteContact} />
      )}
    </div>
  );
}
```

> **`CrmStyles` + `const styles`** : reprendre les styles board de `BoardTab` (`shell, intro, eyebrow, title, lede, addBar, addInput, addBtn, board (grid auto-fit minmax 220px), column, colHead, colDot, colTitle, colCount, colHint, cards, empty, card, cardActions, moveBtn, loadingBox, errorBox, retryBtn, savingNote`) avec la palette jd-zoo. Ajouter les styles spécifiques CRM : `banner` (encadré PAPER bord LINE, padding), `bannerTitle` (gras), `bannerEmpty` (MUTED), `bannerList` (liste sans puces), `bannerItem` (bouton pleine largeur, hover LINE), `bannerName`, `bannerTag` ; et `cardName` (gras INK), `cardOrg` (MUTED petit), `cardRelance` (0.78rem gras), `cardAction` (MUTED, ellipsis 1 ligne), `cardMeta` (flex gap), `cardValue` (badge), `cardBadge`. Garder `moveHidden: { visibility:'hidden' }`. Le `CrmStyles` (balise `<style>`) reprend les `:hover/:focus-visible` de `BoardStyles` en remplaçant `TEAL`→`ACCENT`.

- [ ] **Step 3: Vérifier le build complet**

Run: `npm run build`
Expected: build Astro OK (le composant compile ; il n'est pas encore monté dans CmsApp → c'est la Task 7).

- [ ] **Step 4: Commit**

```bash
git fetch origin master && git rebase origin/master
git add src/components/cms/crm/CrmTab.tsx
git commit -m "feat(crm): CrmTab (board 6 colonnes + bandeau relances)"
git push origin master
```

---

## Task 7 : Config, types, locales, câblage CmsApp

**Files:**
- Modify: `cms.types.ts`
- Modify: `cms.config.ts`
- Modify: `src/components/cms/locales.ts`
- Modify: `src/components/cms/CmsApp.tsx`

- [ ] **Step 1: Ajouter le type `CmsCrmConfig` dans `cms.types.ts`**

Après `CmsVocauxConfig` (≈ ligne 177), ajouter :

```ts
export interface CmsCrmColumn {
  status: string;
  label: string;
  hint: string;
  dot: string;
}

export interface CmsCrmConfig {
  enabled: boolean;
  label?: string; // libellé de l'onglet (défaut: "Prospects")
  columns?: CmsCrmColumn[]; // funnel (défaut interne si absent)
}
```

Puis dans `interface CmsConfig`, après la ligne `vocaux?: CmsVocauxConfig;` :

```ts
  crm?: CmsCrmConfig; // Mini-CRM "Prospects" (D1). Pilote jd-zoo 2026-06.
```

- [ ] **Step 2: Ajouter le bloc `crm` dans `cms.config.ts`**

Dans l'objet `cmsConfig`, à côté de `vocaux:` (avant `collections:` ou `singletons:`), ajouter :

```ts
  crm: {
    enabled: true,
    label: 'Prospects',
    columns: [
      { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
      { status: 'contacte', label: 'Contacté', hint: 'Premier contact', dot: '#3b82f6' },
      { status: 'rdv', label: 'RDV / échange', hint: 'En discussion', dot: '#0ea5e9' },
      { status: 'devis', label: 'Devis envoyé', hint: 'Proposition faite', dot: '#f59e0b' },
      { status: 'gagne', label: 'Gagné', hint: 'Conclu ✅', dot: '#16a34a' },
      { status: 'perdu', label: 'Perdu', hint: 'Sans suite', dot: '#cbd5e1' },
    ],
  },
```

- [ ] **Step 3: Ajouter la clé `tabCrm` dans `locales.ts`**

Dans le dict `FR` (à côté de `tabVocaux:` ligne ≈43) :
```ts
  tabCrm: 'Prospects',
```
Dans le dict `EN` (à côté de `tabVocaux:` ligne ≈483) :
```ts
  tabCrm: 'Prospects',
```

- [ ] **Step 4: Câbler l'onglet dans `CmsApp.tsx`**

(a) Lazy import, après le bloc `MarketingPlanTab` (≈ ligne 29) :
```ts
const CrmTab = lazy(() =>
  import('./crm/CrmTab').then((m) => ({ default: m.CrmTab }))
);
```

(b) `TabId` (ligne 33) — ajouter `'crm'` :
```ts
type TabId = 'site' | 'blog' | 'stats' | 'analytics' | 'account' | 'marketing' | 'vocaux' | 'crm';
```

(c) `interface Route` `view` (ligne 36) — ajouter `'crm'` :
```ts
  view: 'home' | 'singleton' | 'collection' | 'collection-edit' | 'media' | 'sections' | 'seo' | 'theme' | 'stats' | 'analytics' | 'account' | 'blog' | 'marketing' | 'vocaux' | 'crm';
```

(d) `parseHash` — ajouter après la ligne `vocaux` (≈ ligne 47) :
```ts
  if (parts[0] === 'crm') return { view: 'crm' };
```

(e) `getActiveTab` — ajouter après la ligne `vocaux` (≈ ligne 64) :
```ts
  if (route.view === 'crm') return 'crm';
```

(f) `ALL_TABS` (≈ ligne 125) — étendre le type `requires` et ajouter l'entrée (après `vocaux`) :
```ts
const ALL_TABS: Array<{ id: TabId; labelKey: string; icon: string; hash: string; requires?: 'blog' | 'marketing' | 'vocaux' | 'crm' }> = [
  // … entrées existantes …
  { id: 'crm', labelKey: 'tabCrm', icon: '\u{1F465}', hash: '#/crm', requires: 'crm' }, // 👥
];
```
> Placer l'entrée `crm` après `vocaux` et avant `stats` pour un ordre logique (édition → relation → activité).

(g) `getTabs` (≈ ligne 136) — ajouter la condition :
```ts
    if (tab.requires === 'crm') return !!cfg.crm?.enabled;
```

(h) Render switch (`<main>`, ≈ après le bloc `vocaux` ligne 245) — ajouter :
```tsx
          {route.view === 'crm' && cmsConfig.crm?.enabled && (
            <Suspense fallback={<div style={styles.loading}><div style={styles.spinner} /><span>{t('loading')}</span></div>}>
              <CrmTab config={cmsConfig} />
            </Suspense>
          )}
```

- [ ] **Step 5: Build + lancer toute la suite de tests**

Run: `npm run build && npm test`
Expected: build OK, tests verts (helpers). L'onglet "Prospects" apparaît dans la nav (vérifié visuellement en QA Task 8).

- [ ] **Step 6: Commit**

```bash
git fetch origin master && git rebase origin/master
git add cms.types.ts cms.config.ts src/components/cms/locales.ts src/components/cms/CmsApp.tsx
git commit -m "feat(crm): config + types + locales + câblage onglet Prospects"
git push origin master
```

---

## Task 8 : Infra D1 + déploiement + QA preview

> Étapes infra : créer la base D1 distante, appliquer le schéma, **binder la D1 au projet CF Pages via dashboard/API (sans wrangler.toml)**, puis QA sur l'URL preview où le cookie de session existe. Nécessite le token `cloudflare-api-token` (Keychain) et l'accès compte CF. Domaine expert-infra/expert-prod-wf si besoin.

- [ ] **Step 1: Créer la base D1 distante**

```bash
npx wrangler d1 create jdzoo-crm
```
Noter le `database_id` renvoyé (UUID).
Expected: base créée, `database_id` affiché.

- [ ] **Step 2: Appliquer le schéma sur la base distante**

```bash
npx wrangler d1 execute jdzoo-crm --remote --file=./schema.sql
```
Expected: 3 lignes insérées (les exemples).
Vérif : `npx wrangler d1 execute jdzoo-crm --remote --command "SELECT id,name,status FROM contacts"` → 3 lignes.

- [ ] **Step 2bis: Vérifier qu'aucun `wrangler.toml` n'a été créé par mégarde**

Run: `ls wrangler.toml 2>/dev/null && echo "DANGER: supprimer" || echo "OK pas de toml"`
Expected: `OK pas de toml`. (Un toml ferait sauter les bindings KV/R2 du dashboard — cf. spec.)

- [ ] **Step 3: Binder la D1 au projet CF Pages (production + preview)**

Récupérer le nom du projet Pages (`npx wrangler pages project list`), puis ajouter le binding D1 `DB → jdzoo-crm` pour les deux environnements **via le dashboard CF** : Pages → projet jd-zoo → Settings → Functions → D1 database bindings → Add (Production *et* Preview), variable name `DB`, database `jdzoo-crm`.

> Alternative API (si scripté) : PATCH `…/pages/projects/{project}` en injectant `deployment_configs.production.d1_databases.DB` et `…preview.d1_databases.DB` = `{ id: "<database_id>" }`, token Keychain `cloudflare-api-token`. **Ne pas** passer par un wrangler.toml.

- [ ] **Step 4: Redéployer pour prise en compte du binding**

Le binding nécessite un nouveau déploiement. Un push a déjà eu lieu (Task 7) ; déclencher un rebuild :
```bash
git commit --allow-empty -m "chore(crm): redeploy pour binding D1"
git fetch origin master && git rebase origin/master && git push origin master
```
Expected: CF Pages rebuild ; après build, `env.DB` est disponible pour les Functions.

- [ ] **Step 5: QA sur l'URL preview (chemin authentifié complet)**

Se connecter à `/admin` (mot de passe client), puis :
- [ ] L'onglet **"Prospects"** apparaît dans la nav (desktop + mobile bottom bar).
- [ ] Les **3 cartes exemple** s'affichent dans les bonnes colonnes (Nouveau / RDV / Devis).
- [ ] Le **bandeau** liste "EHPAD Les Tilleuls — en retard (2j)" et "Mme Durand — dans 1j" ; clic → ouvre la fiche.
- [ ] **Ajout rapide** : taper un nom + Entrée → carte créée en *Nouveau*.
- [ ] **Flèches ← →** déplacent la carte d'une colonne (persisté : recharger la page, l'état tient).
- [ ] **Ouvrir une fiche** : éditer tél/email/valeur/prochaine action/date de relance/notes → Enregistrer → la carte reflète les changements + la pastille de relance se met à jour.
- [ ] Passer une carte en **Perdu** via les boutons d'étape de la fiche (saut de statut).
- [ ] **Supprimer** une carte (confirmation) → disparaît.
- [ ] **Tél/email cliquables** dans la fiche (`tel:` / `mailto:`).
- [ ] **Mobile** (DevTools responsive) : les 6 colonnes wrappent, pas d'overflow horizontal, bandeau lisible.
- [ ] **Isolation** : `/api/crm/contacts` sans cookie (curl direct sur l'URL preview) → 401.

- [ ] **Step 6: Nettoyage seed (optionnel, à la livraison client)**

Quand la cliente prend la main, supprimer les 3 cartes "(exemple)" via l'UI (ou `DELETE FROM contacts WHERE name LIKE '%(exemple)%'` en remote). À ne PAS faire pendant la QA.

- [ ] **Step 7: Commit final (doc d'état)**

Mettre à jour `pipeline-state.json` / TODO du projet si pertinent, puis :
```bash
git fetch origin master && git rebase origin/master
git add -A
git commit -m "feat(crm): onglet Prospects live en preview (D1 bindé, QA OK)"
git push origin master
```

---

## Notes de portabilité (futurs clients)

Pour activer le CRM sur un autre admin du parc :
1. Copier `src/components/cms/crm/`, `functions/api/crm/`, `schema.sql` dans le projet cible.
2. Ajouter `CmsCrmConfig` à son `cms.types.ts` + bloc `crm` à son `cms.config.ts` + clé `tabCrm` + câblage CmsApp (identique Task 7).
3. Créer sa base D1 `<slug>-crm`, appliquer le schéma, binder `DB` via dashboard (Task 8).
4. Adapter `columns` (labels/couleurs) au métier du client si besoin.

À terme : extraire ce flux en skill `wf-crm-space` (hors scope de ce plan).

---

## Self-Review (rempli par l'auteur du plan)

**Couverture spec :** architecture (CrmTab + D1 + Functions auth) → T3-T8 ✓ ; modèle de données (table contacts) → T1 ✓ ; UX bandeau/colonnes/carte/modal → T2 (relance), T5 (modal), T6 (board+bandeau) ✓ ; 6 colonnes config → T7 ✓ ; câblage onglet "Prospects" → T7 ✓ ; D1 par client + binding sans toml → T8 ✓ ; seed → T1 + T8 ✓ ; non-goals respectés (pas de timeline/import/rappels) ✓.

**Placeholders :** les deux composants (T5/T6) référencent un scaffold concret existant (`BoardTab.tsx`, chemins + lignes) avec le code nouveau/modifié donné en entier — pas de "TODO". Les portions « copier de BoardModal » pointent un fichier réel et précis.

**Cohérence des types :** `Contact`/`ContactPatch`/`CrmColumn`/`Relance` définis en T2, consommés à l'identique en T4/T5/T6 ; statuts (`nouveau…perdu`) cohérents entre `schema.sql` (T1), Functions whitelist (T3), colonnes config (T6/T7) ; binding `DB` cohérent T3 (`env.DB`) / T8 (dashboard).
