// skills/mkt-social-plan/templates/MarketingPlanTab.tsx
// ↳ copié par mkt-social-plan vers projets/<slug>/site/src/components/cms/marketing/MarketingPlanTab.tsx

import { useEffect, useMemo, useState } from 'react';
import { PostCard, type PostCardData, type Network } from './PostCard';

interface ShootingSession {
  id: string;
  suggested_date: string;
  shots_needed: string[];
  posts_covered: string[];
}

interface ThemeEntry {
  week: number;
  theme: string;
  angle: string;
}

interface Plan {
  client_slug: string;
  trimester: string;
  generated_at: string;
  themes: ThemeEntry[];
  posts: PostCardData[];
  shooting_sessions: ShootingSession[];
}

type ViewMode = 'list' | 'calendar';
type NetworkFilter = Network | 'all';

// Le skill mkt-social-plan remplace cette constante à chaque génération
// pour déclarer les trimestres disponibles. Le composant les fetch au mount.
const PLAN_BASE_URL = '/marketing-data'; // exposé par une page Astro ou un endpoint

async function fetchPlan(trimester: string): Promise<Plan> {
  const r = await fetch(`${PLAN_BASE_URL}/plan-${trimester}.json`, { credentials: 'include' });
  if (!r.ok) throw new Error(`plan ${trimester} not found`);
  return r.json();
}

function currentWeekOf(plan: Plan): number {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = plan.posts
    .filter((p) => p.scheduled_date >= today)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  return upcoming[0]?.week ?? 1;
}

export function MarketingPlanTab() {
  const [plans, setPlans] = useState<string[]>([]);
  const [activeTrimester, setActiveTrimester] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all');
  const [toast, setToast] = useState<string | null>(null);

  // Charger la liste des trimestres (via cms.config global.window)
  useEffect(() => {
    // @ts-expect-error injecté par cms.config
    const trimesters: string[] = (window.__cmsConfig?.marketing?.trimesters) || [];
    setPlans(trimesters);
    if (trimesters.length > 0) setActiveTrimester(trimesters[trimesters.length - 1]);
  }, []);

  // Charger le plan actif
  useEffect(() => {
    if (!activeTrimester) return;
    fetchPlan(activeTrimester)
      .then(setPlan)
      .catch((e) => setToast(String(e.message)));
  }, [activeTrimester]);

  const currentWeek = useMemo(() => (plan ? currentWeekOf(plan) : 1), [plan]);

  const filteredPosts = useMemo(() => {
    if (!plan) return [];
    return plan.posts.filter((p) => networkFilter === 'all' || p.network === networkFilter);
  }, [plan, networkFilter]);

  const stats = useMemo(() => {
    if (!plan) return null;
    const total = plan.posts.length;
    const published = plan.posts.filter((p) => p.status === 'published').length;
    const skipped = plan.posts.filter((p) => p.status === 'skipped').length;
    return { total, published, skipped, drafts: total - published - skipped };
  }, [plan]);

  function applyPatch(postId: string, patch: Partial<PostCardData>) {
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        posts: prev.posts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
      };
    });
  }

  if (!plan) {
    return <div className="p-4 text-sm text-gray-600">Chargement du plan marketing...</div>;
  }

  return (
    <section className="p-4 max-w-4xl mx-auto" aria-label="Plan marketing">
      <header className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Plan marketing — {plan.trimester}</h1>
          {plans.length > 1 && (
            <select
              value={activeTrimester || ''}
              onChange={(e) => setActiveTrimester(e.target.value)}
              className="text-sm border rounded p-1"
              aria-label="Choisir un trimestre"
            >
              {plans.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>

        {stats && (
          <p className="text-sm text-gray-600" data-testid="stats-header">
            {stats.published}/{stats.total} publiés · {stats.drafts} drafts · {stats.skipped} skippés
          </p>
        )}

        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setView('list')}
            className={`btn-sm ${view === 'list' ? 'btn-primary' : ''}`}
            type="button"
          >
            📋 Liste
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`btn-sm ${view === 'calendar' ? 'btn-primary' : ''}`}
            type="button"
          >
            📅 Calendrier
          </button>
          <span className="flex-1" />
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value as NetworkFilter)}
            className="text-sm border rounded p-1"
            aria-label="Filtrer par réseau"
          >
            <option value="all">Tous les réseaux</option>
            <option value="facebook">Facebook</option>
            <option value="linkedin">LinkedIn</option>
          </select>
        </div>
      </header>

      {toast && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded">
          {toast} <button onClick={() => setToast(null)} className="underline ml-2" type="button">×</button>
        </div>
      )}

      {view === 'list' ? (
        <ListView
          posts={filteredPosts}
          currentWeek={currentWeek}
          trimester={plan.trimester}
          onPatched={applyPatch}
          onError={setToast}
        />
      ) : (
        <CalendarView
          posts={filteredPosts}
          themes={plan.themes}
          onClickCell={(id) => {
            // pour MVP, juste scroll vers la card dans la liste
            setView('list');
            setTimeout(() => {
              document.querySelector(`[data-testid="postcard-${id}"]`)?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
        />
      )}

      {plan.shooting_sessions.length > 0 && (
        <ShootingSessionsPanel sessions={plan.shooting_sessions} />
      )}
    </section>
  );
}

// ─── ListView ────────────────────────────────────────────────────

interface ListViewProps {
  posts: PostCardData[];
  currentWeek: number;
  trimester: string;
  onPatched: (postId: string, patch: Partial<PostCardData>) => void;
  onError: (msg: string) => void;
}

function ListView({ posts, currentWeek, trimester, onPatched, onError }: ListViewProps) {
  const groups = {
    now: posts.filter((p) => p.week === currentWeek),
    soon: posts.filter((p) => p.week > currentWeek && p.week <= currentWeek + 2),
    later: posts.filter((p) => p.week > currentWeek + 2 || p.week < currentWeek),
  };

  return (
    <div className="space-y-6">
      {groups.now.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">📌 Cette semaine</h2>
          <div className="space-y-3">
            {groups.now.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                trimester={trimester}
                onPatched={(patch) => onPatched(p.id, patch)}
                onError={onError}
              />
            ))}
          </div>
        </section>
      )}

      {groups.soon.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-2">📆 À venir (2 sem)</h2>
          <div className="space-y-3">
            {groups.soon.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                trimester={trimester}
                onPatched={(patch) => onPatched(p.id, patch)}
                onError={onError}
              />
            ))}
          </div>
        </section>
      )}

      {groups.later.length > 0 && (
        <details className="mt-4">
          <summary className="text-lg font-semibold cursor-pointer">📚 Plus tard / archivé ({groups.later.length})</summary>
          <div className="space-y-3 mt-2">
            {groups.later.map((p) => (
              <PostCard
                key={p.id}
                post={p}
                trimester={trimester}
                onPatched={(patch) => onPatched(p.id, patch)}
                onError={onError}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ─── CalendarView ────────────────────────────────────────────────

interface CalendarViewProps {
  posts: PostCardData[];
  themes: ThemeEntry[];
  onClickCell: (postId: string) => void;
}

function CalendarView({ posts, themes, onClickCell }: CalendarViewProps) {
  const weeks = Array.from({ length: 13 }, (_, i) => i + 1);
  const postByKey = new Map<string, PostCardData>();
  posts.forEach((p) => postByKey.set(`${p.week}-${p.network}`, p));

  function cellLabel(p: PostCardData | undefined) {
    if (!p) return '—';
    const emoji = p.status === 'published' ? '✅' : p.status === 'skipped' ? '⏭️' : '📝';
    return `${emoji}`;
  }

  return (
    <div className="overflow-x-auto" role="table" aria-label="Calendrier plan marketing">
      <table className="border-collapse text-xs w-full">
        <thead>
          <tr>
            <th className="border p-1 bg-gray-50">Réseau</th>
            {weeks.map((w) => (
              <th key={w} className="border p-1 bg-gray-50">S{w}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['facebook', 'linkedin'] as Network[]).map((net) => (
            <tr key={net}>
              <td className="border p-1 font-semibold">{net === 'facebook' ? 'FB' : 'LI'}</td>
              {weeks.map((w) => {
                const p = postByKey.get(`${w}-${net}`);
                return (
                  <td
                    key={w}
                    className={`border p-1 text-center ${p ? 'cursor-pointer hover:bg-yellow-50' : 'bg-gray-50'}`}
                    onClick={() => p && onClickCell(p.id)}
                    title={p ? `${p.scheduled_date} — ${p.text.slice(0, 40)}...` : 'Pas de post'}
                  >
                    {cellLabel(p)}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="bg-blue-50">
            <td className="border p-1 italic text-gray-700">Thème</td>
            {weeks.map((w) => {
              const t = themes.find((x) => x.week === w);
              return (
                <td key={w} className="border p-1 text-center text-xs italic text-gray-700" title={t?.theme}>
                  {t ? t.theme.slice(0, 20) : '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── ShootingSessionsPanel ───────────────────────────────────────

function ShootingSessionsPanel({ sessions }: { sessions: ShootingSession[] }) {
  return (
    <section className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded" aria-label="Sessions photo">
      <h2 className="text-lg font-semibold mb-2">📸 Sessions photo suggérées</h2>
      <ul className="space-y-2">
        {sessions.map((s) => (
          <li key={s.id} className="text-sm">
            <strong>{s.suggested_date}</strong> — à shooter :
            <ul className="ml-4 list-disc">
              {s.shots_needed.map((shot, i) => (
                <li key={i}>{shot}</li>
              ))}
            </ul>
            <span className="text-xs text-gray-600">Couvre : {s.posts_covered.join(', ')}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
