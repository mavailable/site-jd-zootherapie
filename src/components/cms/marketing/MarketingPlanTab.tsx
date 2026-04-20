import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
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
  trimester_label?: string;
  generated_at: string;
  themes: ThemeEntry[];
  posts: PostCardData[];
  shooting_sessions: ShootingSession[];
}

type ViewMode = 'list' | 'calendar';
type NetworkFilter = Network | 'all';

async function fetchPlan(trimester: string): Promise<Plan> {
  const r = await fetch(`/marketing-data/plan-${trimester}.json`, { credentials: 'include' });
  if (!r.ok) throw new Error(`Plan ${trimester} introuvable`);
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
  const [trimesters, setTrimesters] = useState<string[]>([]);
  const [activeTrimester, setActiveTrimester] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [view, setView] = useState<ViewMode>('list');
  const [networkFilter, setNetworkFilter] = useState<NetworkFilter>('all');
  const [toast, setToast] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cfg = (window as unknown as { __cmsConfig?: { marketing?: { trimesters?: string[] } } })
      .__cmsConfig;
    const list = cfg?.marketing?.trimesters ?? [];
    setTrimesters(list);
    if (list.length > 0) setActiveTrimester(list[list.length - 1]);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (!activeTrimester) return;
    setLoading(true);
    fetchPlan(activeTrimester)
      .then((p) => {
        setPlan(p);
        setLoading(false);
      })
      .catch((e) => {
        setToast(String(e.message));
        setLoading(false);
      });
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
    const drafts = total - published - skipped;
    return { total, published, skipped, drafts, pct: total > 0 ? Math.round((published / total) * 100) : 0 };
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

  if (loading) {
    return <div style={styles.loader}>Chargement du plan marketing...</div>;
  }

  if (!plan) {
    return (
      <section style={styles.container}>
        <div style={styles.emptyState}>
          <h2 style={styles.emptyTitle}>Aucun plan marketing</h2>
          <p style={styles.emptyText}>
            Ton plan de publication sera généré par l'équipe Marc M puis apparaîtra ici.
          </p>
          {toast && <div style={styles.errorBox}>{toast}</div>}
        </div>
      </section>
    );
  }

  return (
    <section style={styles.container}>
      {/* Hero header */}
      <header style={styles.hero}>
        <div>
          <div style={styles.sectionLabel}>Plan de publication</div>
          <h1 style={styles.title}>{plan.trimester_label ?? plan.trimester}</h1>
        </div>
        {trimesters.length > 1 && (
          <select
            value={activeTrimester || ''}
            onChange={(e) => setActiveTrimester(e.target.value)}
            style={styles.select}
            aria-label="Choisir un trimestre"
          >
            {trimesters.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </header>

      {/* Stats KPI */}
      {stats && (
        <div style={styles.statsGrid}>
          <KpiCard label="Publiés" value={stats.published} total={stats.total} color="#16a34a" />
          <KpiCard label="À publier" value={stats.drafts} color="#a16207" />
          <KpiCard label="Skippés" value={stats.skipped} color="#64748b" />
          <KpiCard label="Progression" value={stats.pct} suffix="%" color="#2563eb" />
        </div>
      )}

      {/* Controls */}
      <div style={styles.controlsRow}>
        <div style={styles.viewToggle}>
          <button
            type="button"
            onClick={() => setView('list')}
            style={view === 'list' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setView('calendar')}
            style={view === 'calendar' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
          >
            Calendrier
          </button>
        </div>
        <div style={styles.filterWrap}>
          <label style={styles.filterLabel}>Réseau</label>
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value as NetworkFilter)}
            style={styles.select}
          >
            <option value="all">Tous les réseaux</option>
            <option value="facebook">Facebook seulement</option>
            <option value="linkedin">LinkedIn seulement</option>
          </select>
        </div>
      </div>

      {toast && (
        <div style={styles.errorBox}>
          {toast}
          <button onClick={() => setToast(null)} style={styles.errorClose} type="button">
            ✕
          </button>
        </div>
      )}

      {/* Content */}
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
            setView('list');
            setTimeout(() => {
              document
                .querySelector(`[data-testid="postcard-${id}"]`)
                ?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
          }}
        />
      )}

      {plan.shooting_sessions.length > 0 && view === 'list' && (
        <ShootingSessionsPanel sessions={plan.shooting_sessions} />
      )}
    </section>
  );
}

// ─── KpiCard ─────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  total,
  suffix,
  color,
}: {
  label: string;
  value: number;
  total?: number;
  suffix?: string;
  color: string;
}) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, color }}>
        {value}
        {suffix ?? (total ? <span style={styles.kpiTotal}> / {total}</span> : '')}
      </div>
    </div>
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
    <div style={styles.listWrap}>
      {groups.now.length > 0 && (
        <section style={styles.listSection}>
          <h2 style={styles.listSectionTitle}>
            Cette semaine
            <span style={styles.listSectionCount}>{groups.now.length}</span>
          </h2>
          <div style={styles.postsGrid}>
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
        <section style={styles.listSection}>
          <h2 style={styles.listSectionTitle}>
            À venir · 2 prochaines semaines
            <span style={styles.listSectionCount}>{groups.soon.length}</span>
          </h2>
          <div style={styles.postsGrid}>
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
        <details style={styles.laterDetails}>
          <summary style={styles.laterSummary}>
            Plus tard · archivé
            <span style={styles.listSectionCount}>{groups.later.length}</span>
          </summary>
          <div style={{ ...styles.postsGrid, marginTop: '0.75rem' }}>
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
  const postsByCell = new Map<string, PostCardData[]>();
  posts.forEach((p) => {
    const key = `${p.week}-${p.network}`;
    if (!postsByCell.has(key)) postsByCell.set(key, []);
    postsByCell.get(key)!.push(p);
  });

  function cellClass(status: string) {
    if (status === 'published') return { background: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' };
    if (status === 'skipped') return { background: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
    return { background: '#fef9c3', color: '#a16207', border: '#fde68a' };
  }

  return (
    <div style={styles.calendarWrap}>
      <table style={styles.calendarTable}>
        <thead>
          <tr>
            <th style={styles.calHeaderFixed}>Réseau</th>
            {weeks.map((w) => (
              <th key={w} style={styles.calHeader}>
                S{w}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(['facebook', 'linkedin'] as Network[]).map((net) => (
            <tr key={net}>
              <td style={styles.calRowLabel}>{net === 'facebook' ? 'Facebook' : 'LinkedIn'}</td>
              {weeks.map((w) => {
                const cellPosts = postsByCell.get(`${w}-${net}`) ?? [];
                if (cellPosts.length === 0) {
                  return <td key={w} style={styles.calCellEmpty} />;
                }
                return (
                  <td key={w} style={styles.calCellGroup}>
                    {cellPosts.map((p) => {
                      const s = cellClass(p.status);
                      return (
                        <button
                          key={p.id}
                          onClick={() => onClickCell(p.id)}
                          style={{
                            ...styles.calCellBtn,
                            background: s.background,
                            color: s.color,
                            borderColor: s.border,
                          }}
                          title={`${p.scheduled_date} — ${p.text.slice(0, 80)}...`}
                          type="button"
                        >
                          {p.status === 'published' ? '✓' : p.status === 'skipped' ? '⊘' : '●'}
                        </button>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr style={styles.calThemeRow}>
            <td style={styles.calRowLabel}>Thème</td>
            {weeks.map((w) => {
              const t = themes.find((x) => x.week === w);
              return (
                <td key={w} style={styles.calThemeCell} title={t?.theme}>
                  {t ? t.theme.slice(0, 22) + (t.theme.length > 22 ? '…' : '') : '—'}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <div style={styles.calLegend}>
        <span style={styles.calLegendItem}>
          <span style={{ ...styles.calLegendDot, background: '#fef9c3', border: '1px solid #fde68a' }} /> À publier
        </span>
        <span style={styles.calLegendItem}>
          <span style={{ ...styles.calLegendDot, background: '#f0fdf4', border: '1px solid #bbf7d0' }} /> Publié
        </span>
        <span style={styles.calLegendItem}>
          <span style={{ ...styles.calLegendDot, background: '#f8fafc', border: '1px solid #e2e8f0' }} /> Skippé
        </span>
      </div>
    </div>
  );
}

// ─── ShootingSessionsPanel ───────────────────────────────────────

function ShootingSessionsPanel({ sessions }: { sessions: ShootingSession[] }) {
  return (
    <section style={styles.shootingPanel}>
      <h2 style={styles.shootingTitle}>
        📸 Sessions photo suggérées
        <span style={styles.listSectionCount}>{sessions.length}</span>
      </h2>
      <p style={styles.shootingIntro}>
        Regrouper les prises de vue pour les posts de type "brut" — à planifier avec Marc ou en autonomie.
      </p>
      <div style={styles.shootingGrid}>
        {sessions.map((s) => (
          <div key={s.id} style={styles.shootingCard}>
            <div style={styles.shootingDate}>{s.suggested_date}</div>
            <ul style={styles.shootingList}>
              {s.shots_needed.map((shot, i) => (
                <li key={i} style={styles.shootingItem}>
                  {shot}
                </li>
              ))}
            </ul>
            <div style={styles.shootingCovers}>
              Couvre : {s.posts_covered.length} post{s.posts_covered.length > 1 ? 's' : ''}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '1.5rem 1.25rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  loader: {
    padding: '3rem 1.5rem',
    textAlign: 'center',
    color: '#64748b',
    fontSize: '0.9375rem',
  },
  emptyState: {
    padding: '3rem 2rem',
    textAlign: 'center',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
  },
  emptyTitle: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' },
  emptyText: { fontSize: '0.875rem', color: '#64748b' },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  sectionLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94a3b8',
    marginBottom: '0.25rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '0.75rem',
  },
  kpiCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  kpiLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  kpiTotal: { fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' },
  controlsRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  viewToggle: {
    display: 'inline-flex',
    background: '#f1f5f9',
    borderRadius: '10px',
    padding: '0.25rem',
    gap: '0.125rem',
  },
  toggleBtn: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#64748b',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    padding: '0.4375rem 0.875rem',
    cursor: 'pointer',
  },
  toggleBtnActive: {
    background: '#fff',
    color: '#0f172a',
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
  },
  filterWrap: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  filterLabel: { fontSize: '0.75rem', fontWeight: 600, color: '#64748b' },
  select: {
    fontSize: '0.8125rem',
    color: '#334155',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.4375rem 0.75rem',
    cursor: 'pointer',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    borderRadius: '10px',
    padding: '0.625rem 0.875rem',
    fontSize: '0.8125rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorClose: {
    background: 'transparent',
    border: 'none',
    color: '#b91c1c',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  listWrap: { display: 'flex', flexDirection: 'column', gap: '2rem' },
  listSection: { display: 'flex', flexDirection: 'column', gap: '0.875rem' },
  listSectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  listSectionCount: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    background: '#f1f5f9',
    borderRadius: '999px',
    padding: '0.125rem 0.5rem',
  },
  postsGrid: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  laterDetails: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '1rem',
  },
  laterSummary: {
    cursor: 'pointer',
    fontWeight: 600,
    color: '#334155',
    fontSize: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  calendarWrap: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    overflowX: 'auto',
  },
  calendarTable: {
    width: '100%',
    borderCollapse: 'separate',
    borderSpacing: '0.25rem',
    fontSize: '0.75rem',
  },
  calHeader: {
    fontWeight: 600,
    color: '#64748b',
    fontSize: '0.6875rem',
    textAlign: 'center',
    padding: '0.375rem',
    background: '#f8fafc',
    borderRadius: '6px',
    minWidth: '52px',
  },
  calHeaderFixed: {
    fontWeight: 600,
    color: '#64748b',
    fontSize: '0.6875rem',
    textAlign: 'left',
    padding: '0.375rem 0.5rem',
    minWidth: '80px',
  },
  calRowLabel: {
    fontWeight: 600,
    color: '#334155',
    padding: '0.5rem',
    fontSize: '0.75rem',
  },
  calCellEmpty: {
    background: '#f8fafc',
    borderRadius: '6px',
    height: '36px',
  },
  calCellGroup: {
    padding: '0.125rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  calCellBtn: {
    fontSize: '0.75rem',
    fontWeight: 700,
    border: '1px solid',
    borderRadius: '6px',
    padding: '0.375rem',
    cursor: 'pointer',
    width: '100%',
    minHeight: '28px',
  },
  calThemeRow: { background: '#f1f5f9' },
  calThemeCell: {
    fontSize: '0.6875rem',
    fontStyle: 'italic',
    color: '#64748b',
    padding: '0.375rem 0.25rem',
    textAlign: 'center',
    background: '#f8fafc',
    borderRadius: '6px',
  },
  calLegend: {
    marginTop: '0.875rem',
    display: 'flex',
    gap: '1rem',
    fontSize: '0.75rem',
    color: '#64748b',
    flexWrap: 'wrap',
  },
  calLegendItem: { display: 'inline-flex', alignItems: 'center', gap: '0.375rem' },
  calLegendDot: {
    width: '14px',
    height: '14px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  shootingPanel: {
    marginTop: '1rem',
    padding: '1.25rem',
    background: '#fefce8',
    border: '1px solid #fde68a',
    borderRadius: '12px',
  },
  shootingTitle: {
    fontSize: '0.9375rem',
    fontWeight: 700,
    color: '#854d0e',
    margin: '0 0 0.375rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  shootingIntro: {
    fontSize: '0.8125rem',
    color: '#713f12',
    margin: '0 0 1rem',
  },
  shootingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '0.75rem',
  },
  shootingCard: {
    background: '#fff',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '0.875rem 1rem',
  },
  shootingDate: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#713f12',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    marginBottom: '0.5rem',
  },
  shootingList: { margin: 0, padding: 0, listStyle: 'none' },
  shootingItem: {
    fontSize: '0.8125rem',
    color: '#334155',
    padding: '0.25rem 0',
    borderBottom: '1px solid #fef3c7',
  },
  shootingCovers: {
    fontSize: '0.6875rem',
    color: '#92400e',
    marginTop: '0.5rem',
    fontStyle: 'italic',
  },
};
