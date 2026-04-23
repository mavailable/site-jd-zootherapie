import type { CmsSingleton, CmsSingletonGroup } from '../../../../cms.types';

// ─── Dashboard groups — ordre d'affichage et libellés FR ──────────
//
// Ajouté 2026-04-22 : le dashboard /admin était plat et cachait tous les
// singletons éditoriaux sous un accordéon "Plus d'outils". Le regroupement
// par contexte d'usage (Page d'accueil, À propos, Contact, etc.) rend les
// singletons découvrables en ≤ 2 clics.
//
// Rétrocompatibilité : un singleton sans `group` défini tombe dans 'reglages'
// → sur les projets non annotés, tous les singletons apparaissent dans
// l'accordéon "Réglages avancés" = comportement équivalent à l'ancien "Plus
// d'outils". Zéro régression.

export const GROUP_ORDER: CmsSingletonGroup[] = [
  'accueil',
  'a-propos',
  'contact',
  'pages',
  'reglages',
  'legal',
];

export const GROUP_LABELS: Record<CmsSingletonGroup, string> = {
  'accueil': "Page d'accueil",
  'a-propos': 'À propos',
  'contact': 'Contact',
  'pages': 'Pages du site',
  'reglages': 'Réglages avancés',
  'legal': 'Légal',
};

// Les 3 derniers groupes sont pliés par défaut (accordéon).
// Les 3 premiers sont toujours dépliés (contexte éditorial principal).
// 'pages' concerne les en-têtes de pages (titre + sous-titre de /about, /contact,
// etc.) — éditable mais moins fréquent, d'où le pliage.
export const COLLAPSED_BY_DEFAULT: Set<CmsSingletonGroup> = new Set([
  'pages',
  'reglages',
  'legal',
]);

export interface GroupedSingleton {
  key: string;
  singleton: CmsSingleton;
}

export type GroupedSingletons = Record<CmsSingletonGroup, GroupedSingleton[]>;

/**
 * Regroupe les singletons par `group` puis les trie par `dashboardPriority`
 * (ascendant, défaut 50), puis par ordre d'insertion (stable).
 *
 * Fallback : un singleton sans `group` est rangé dans 'reglages'.
 *
 * Retour : un dict avec une clé par groupe (toujours les 6 groupes présents,
 * liste vide si aucun singleton pour ce groupe). Permet de faire
 * `GROUP_ORDER.map(g => groups[g])` sans null-checks côté consumer.
 */
export function groupSingletons(
  singletons: Record<string, CmsSingleton>
): GroupedSingletons {
  // Init : 6 groupes avec listes vides
  const groups: GroupedSingletons = {
    'accueil': [],
    'a-propos': [],
    'contact': [],
    'pages': [],
    'reglages': [],
    'legal': [],
  };

  // Indexation : on préserve l'ordre d'insertion via un compteur,
  // utilisé comme tie-breaker si deux singletons ont la même dashboardPriority.
  const entries = Object.entries(singletons);
  const indexed = entries.map(([key, singleton], originalIndex) => ({
    key,
    singleton,
    originalIndex,
    group: singleton.group ?? 'reglages',
    priority: singleton.dashboardPriority ?? 50,
  }));

  // Distribuer dans les 6 buckets
  for (const item of indexed) {
    groups[item.group].push(item);
  }

  // Trier chaque bucket : (1) dashboardPriority asc, (2) originalIndex asc
  for (const g of Object.keys(groups) as CmsSingletonGroup[]) {
    groups[g].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.originalIndex - b.originalIndex;
    });
    // Nettoyage : on ne renvoie que key + singleton au consumer
    groups[g] = groups[g].map(({ key, singleton }) => ({ key, singleton }));
  }

  return groups;
}

/**
 * Helper : mapping par défaut emoji → groupe, si le singleton n'a pas
 * son propre `dashboardIcon` ET si `singletonIcon(key)` ne retourne pas
 * quelque chose de plus spécifique. Fallback de dernier recours.
 */
export const GROUP_DEFAULT_ICON: Record<CmsSingletonGroup, string> = {
  'accueil': '\u{1F3E0}',     // 🏠
  'a-propos': '\u{1F464}',    // 👤
  'contact': '\u{1F4E7}',     // 📧
  'pages': '\u{1F4C4}',       // 📄
  'reglages': '\u{2699}\u{FE0F}', // ⚙️
  'legal': '\u{2696}\u{FE0F}',    // ⚖️
};
