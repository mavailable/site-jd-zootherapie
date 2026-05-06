import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useContent } from './hooks/useContent';
import { navigate } from './CmsApp';
import {
  articleState,
  slugFromFilename,
  slugify,
  formatDateFr,
  formatDateTimeFr,
  defaultPickerValue,
  pickerValueToIso,
  pickerMin,
  type ArticleEntry,
  type ArticleData,
  type BlogIdea,
} from './blogHelpers';

interface BlogTabProps {
  config: CmsConfig;
}

const IDEAS_PATH = 'src/content/blog-ideas/index.json';
const BLOG_PATH = 'src/content/blog';
const MARC_WHATSAPP = '33688766648';

function whatsappUrl(title: string): string {
  const text =
    `Bonjour Marc, j'aimerais un article sur mon blog : "${title}". ` +
    `Je t'envoie un vocal avec une anecdote / mon avis sur le sujet.`;
  return `https://wa.me/${MARC_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function startWritingSelf(idea: BlogIdea) {
  try {
    sessionStorage.setItem('blog_new_prefill', JSON.stringify({ title: idea.title }));
  } catch {/* silent */}
  navigate('#/collection/blog/_new');
}

interface IdeasState {
  data: { ideas: BlogIdea[] } | null;
  sha: string;
  error: boolean;
}

interface Toast {
  message: string;
  href?: string;
  hrefLabel?: string;
}

export function BlogTab({ config }: BlogTabProps) {
  const { fetchFile, fetchList, saveFile } = useContent();
  const [ideas, setIdeas] = useState<IdeasState>({ data: null, sha: '', error: false });
  const [articles, setArticles] = useState<ArticleEntry[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [scheduleModal, setScheduleModal] = useState<ArticleEntry | null>(null);
  const [editingIdeaIdx, setEditingIdeaIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);

  // Fermer le menu au clic ailleurs / Escape
  useEffect(() => {
    if (!openMenuFor) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if ('key' in e && e.key !== 'Escape') return;
      setOpenMenuFor(null);
    };
    window.addEventListener('click', handler as EventListener);
    window.addEventListener('keydown', handler as EventListener);
    return () => {
      window.removeEventListener('click', handler as EventListener);
      window.removeEventListener('keydown', handler as EventListener);
    };
  }, [openMenuFor]);

  const siteName = config.siteName;
  const marcWhatsapp = config.site?.contactMarc?.whatsapp || MARC_WHATSAPP;
  const siteUrl = config.site?.siteUrl || '';

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(id);
    }
  }, [toast]);

  const loadAll = useCallback(async () => {
    let ideasFile: { ideas: BlogIdea[] } | null = null;
    let ideasSha = '';
    try {
      const f = await fetchFile(IDEAS_PATH);
      ideasFile = f.content as { ideas: BlogIdea[] };
      ideasSha = f.sha;
      setIdeas({ data: ideasFile, sha: ideasSha, error: false });
    } catch {
      setIdeas({ data: { ideas: [] }, sha: '', error: true });
    }

    try {
      const files = await fetchList(BLOG_PATH);
      const jsonFiles = files.filter((f) => f.name.endsWith('.json'));
      const enriched: ArticleEntry[] = await Promise.all(
        jsonFiles.map(async (f) => {
          try {
            const d = await fetchFile(`${BLOG_PATH}/${f.name}`);
            const data = d.content as ArticleData;
            return {
              name: f.name,
              slug: slugFromFilename(f.name),
              state: articleState(data),
              data,
              sha: d.sha,
            };
          } catch {
            return {
              name: f.name,
              slug: slugFromFilename(f.name),
              state: 'published' as const,
              data: {},
            };
          }
        })
      );
      setArticles(enriched);
      setArticlesLoading(false);

      // Migration one-shot orphelins (articles publiés sans entry dans blog-ideas)
      if (ideasFile && ideasSha) {
        const ideaSlugs = new Set(
          ideasFile.ideas.filter((i) => i.slug).map((i) => i.slug as string)
        );
        const orphans = enriched.filter(
          (a) => a.state === 'published' && !ideaSlugs.has(a.slug)
        );
        if (orphans.length > 0) {
          const newIdeas: BlogIdea[] = [
            ...ideasFile.ideas,
            ...orphans.map((a) => ({
              title: a.data.title || a.slug,
              source: 'historique',
              status: 'publie' as const,
              slug: a.slug,
            })),
          ];
          try {
            const result = await saveFile(
              IDEAS_PATH,
              { ideas: newIdeas },
              ideasSha,
              `chore(blog): migration ${orphans.length} article(s) orphelin(s) → blog-ideas`
            );
            setIdeas({ data: { ideas: newIdeas }, sha: result.sha, error: false });
          } catch {/* silent */}
        }
      }
    } catch {
      setArticlesLoading(false);
    }
  }, [fetchFile, fetchList, saveFile]);

  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───── Helpers data ─────

  const drafts = useMemo(
    () => articles.filter((a) => a.state === 'draft').sort((a, b) => b.slug.localeCompare(a.slug)),
    [articles]
  );
  const scheduled = useMemo(
    () => articles
      .filter((a) => a.state === 'scheduled')
      .sort((a, b) => (a.data.publish_at || '').localeCompare(b.data.publish_at || '')),
    [articles]
  );
  const published = useMemo(
    () => articles
      .filter((a) => a.state === 'published')
      .sort((a, b) => (b.data.date || '').localeCompare(a.data.date || ''))
      .slice(0, 3),
    [articles]
  );
  const totalPublished = useMemo(
    () => articles.filter((a) => a.state === 'published').length,
    [articles]
  );

  const aFaireIdeas = useMemo(
    () => (ideas.data?.ideas || []).filter((i) => !i.status || i.status === 'a-faire').slice(0, 5),
    [ideas]
  );
  const archiveIdeas = useMemo(
    () => (ideas.data?.ideas || []).filter((i) => i.status === 'archive'),
    [ideas]
  );

  // ───── Mutations ─────

  const persistIdeas = useCallback(async (newIdeas: BlogIdea[], commitMsg: string) => {
    if (!ideas.sha) return;
    setBusy(true);
    try {
      const r = await saveFile(IDEAS_PATH, { ideas: newIdeas }, ideas.sha, commitMsg);
      setIdeas({ data: { ideas: newIdeas }, sha: r.sha, error: false });
    } finally {
      setBusy(false);
    }
  }, [ideas.sha, saveFile]);

  const persistArticle = useCallback(
    async (article: ArticleEntry, patch: Partial<ArticleData>, commitMsg: string) => {
      if (!article.sha) {
        setToast({ message: 'Erreur : SHA de fichier manquant — recharger la page.' });
        throw new Error('Missing sha');
      }
      setBusy(true);
      try {
        const newData = { ...article.data, ...patch };
        if (patch.publish_at === undefined && 'publish_at' in patch) {
          delete (newData as Record<string, unknown>).publish_at;
        }
        if (patch.draft === undefined && 'draft' in patch) {
          delete (newData as Record<string, unknown>).draft;
        }
        const r = await saveFile(`${BLOG_PATH}/${article.name}`, newData, article.sha, commitMsg);
        setArticles((prev) =>
          prev.map((a) =>
            a.name === article.name
              ? { ...a, data: newData, state: articleState(newData), sha: r.sha }
              : a
          )
        );
        return r;
      } finally {
        setBusy(false);
      }
    },
    [saveFile]
  );

  // ───── Actions idées ─────

  const addNewIdea = useCallback(() => {
    const title = window.prompt("Titre de votre nouvelle idée d'article :");
    if (!title || !title.trim()) return;
    const newIdeas: BlogIdea[] = [
      ...(ideas.data?.ideas || []),
      { title: title.trim(), source: 'idée client', status: 'a-faire' },
    ];
    persistIdeas(newIdeas, `feat(blog-ideas): ajoute idée "${title.trim().slice(0, 50)}"`);
  }, [ideas, persistIdeas]);

  const skipIdea = useCallback(
    (idx: number) => {
      const idea = (ideas.data?.ideas || [])[idx];
      if (!idea) return;
      if (!window.confirm(`Skipper l'idée "${idea.title}" ?`)) return;
      const newIdeas = (ideas.data?.ideas || []).map((i, k) =>
        k === idx ? { ...i, status: 'archive' as const } : i
      );
      persistIdeas(newIdeas, `chore(blog-ideas): skip "${idea.title.slice(0, 50)}"`);
    },
    [ideas, persistIdeas]
  );

  const restoreIdea = useCallback(
    (idx: number) => {
      const newIdeas = (ideas.data?.ideas || []).map((i, k) =>
        k === idx ? { ...i, status: 'a-faire' as const } : i
      );
      const idea = (ideas.data?.ideas || [])[idx];
      persistIdeas(newIdeas, `chore(blog-ideas): restore "${idea?.title.slice(0, 50)}"`);
    },
    [ideas, persistIdeas]
  );

  const renameIdea = useCallback(
    (idx: number, newTitle: string) => {
      const trimmed = newTitle.trim();
      if (!trimmed) return;
      const newIdeas = (ideas.data?.ideas || []).map((i, k) =>
        k === idx ? { ...i, title: trimmed } : i
      );
      persistIdeas(newIdeas, `chore(blog-ideas): rename idée`);
      setEditingIdeaIdx(null);
    },
    [ideas, persistIdeas]
  );

  // ───── Actions articles ─────

  const publishNow = useCallback(
    async (a: ArticleEntry) => {
      try {
        await persistArticle(
          a,
          { draft: false, publish_at: undefined },
          `feat(blog): publie "${a.data.title || a.slug}"`
        );
        setToast({
          message: `✓ Article publié — en ligne dans ~1 min`,
          href: siteUrl ? `${siteUrl}/blog/${a.slug}` : undefined,
          hrefLabel: 'Voir',
        });
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Erreur inconnue';
        setToast({ message: `Erreur publication : ${m}` });
      }
    },
    [persistArticle, siteUrl]
  );

  const unpublish = useCallback(
    async (a: ArticleEntry) => {
      if (!window.confirm(`Dépublier "${a.data.title || a.slug}" et le repasser en brouillon ?`))
        return;
      try {
        await persistArticle(
          a,
          { draft: true, publish_at: undefined },
          `chore(blog): dépublie "${a.data.title || a.slug}"`
        );
        setToast({ message: 'Article dépublié, repassé en brouillon.' });
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Erreur inconnue';
        setToast({ message: `Erreur dépublication : ${m}` });
      }
    },
    [persistArticle]
  );

  const cancelSchedule = useCallback(
    async (a: ArticleEntry) => {
      try {
        await persistArticle(
          a,
          { draft: true, publish_at: undefined },
          `chore(blog): annule programmation "${a.data.title || a.slug}"`
        );
        setToast({ message: 'Programmation annulée. Article repassé en brouillon.' });
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Erreur inconnue';
        setToast({ message: `Erreur : ${m}` });
      }
    },
    [persistArticle]
  );

  const submitSchedule = useCallback(
    async (a: ArticleEntry, localValue: string) => {
      const iso = pickerValueToIso(localValue);
      const when = new Date(iso);
      if (when.getTime() < Date.now() + 25 * 60 * 1000) {
        setToast({ message: 'La date doit être au moins dans 30 minutes.' });
        return;
      }
      try {
        await persistArticle(
          a,
          { draft: false, publish_at: iso },
          `feat(blog): programme "${a.data.title || a.slug}" pour ${formatDateTimeFr(iso)}`
        );
        setScheduleModal(null);
        setToast({ message: `✓ Article programmé pour ${formatDateTimeFr(iso)}` });
      } catch (err) {
        const m = err instanceof Error ? err.message : 'Erreur inconnue';
        setToast({ message: `Erreur programmation : ${m}` });
      }
    },
    [persistArticle]
  );

  // ───── Render ─────

  return (
    <div style={styles.fadeIn}>
      {/* KPIs */}
      <div style={styles.kpis}>
        <KpiBadge label="brouillons" value={drafts.length} icon="✏️" />
        <KpiBadge label="programmés" value={scheduled.length} icon="⏰" />
        <KpiBadge label="idées" value={aFaireIdeas.length} icon="💡" />
        <KpiBadge label="publiés" value={totalPublished} icon="🌐" />
      </div>

      {/* 1. À FINIR (brouillons) */}
      {drafts.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>✏️ À finir</h2>
          <div style={styles.cardList}>
            {drafts.map((a) => (
              <div key={a.name} style={styles.card}>
                <div style={styles.cardTitle}>{a.data.title || a.slug}</div>
                {a.data.date && (
                  <div style={styles.cardMeta}>Brouillon · daté {formatDateFr(a.data.date)}</div>
                )}
                <div style={styles.cardActions}>
                  <a href={`#/collection/blog/${a.slug}`} style={styles.btnPrimary}>
                    ✏️ Reprendre
                  </a>
                  <button
                    type="button"
                    style={styles.btnSuccess}
                    disabled={busy}
                    onClick={() => publishNow(a)}
                  >
                    ✓ Publier maintenant
                  </button>
                  <button
                    type="button"
                    style={styles.btnGhost}
                    disabled={busy}
                    onClick={() => setScheduleModal(a)}
                  >
                    ⏰ Programmer…
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. PROGRAMMÉS */}
      {scheduled.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>⏰ Programmés</h2>
          <div style={styles.cardList}>
            {scheduled.map((a) => (
              <div key={a.name} style={styles.cardScheduled}>
                <div style={styles.cardTitle}>{a.data.title || a.slug}</div>
                <div style={styles.cardMetaScheduled}>
                  Programmé pour <strong>{formatDateTimeFr(a.data.publish_at)}</strong>
                </div>
                <div style={styles.cardActions}>
                  <button
                    type="button"
                    style={styles.btnGhost}
                    disabled={busy}
                    onClick={() => setScheduleModal(a)}
                  >
                    Modifier la date
                  </button>
                  <button
                    type="button"
                    style={styles.btnSuccess}
                    disabled={busy}
                    onClick={() => publishNow(a)}
                  >
                    ✓ Publier maintenant
                  </button>
                  <button
                    type="button"
                    style={styles.btnGhost}
                    disabled={busy}
                    onClick={() => cancelSchedule(a)}
                  >
                    ↩ Re-brouillon
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. IDÉES À EXPLOITER */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>💡 Idées à exploiter</h2>
          <button type="button" style={styles.addBtn} onClick={addNewIdea} disabled={busy}>
            + Nouvelle idée
          </button>
        </div>

        {ideas.error && (
          <div style={styles.placeholder}>
            Marc n'a pas encore préparé d'idées pour votre blog.
            <br />
            <a
              href={`https://wa.me/${marcWhatsapp}?text=${encodeURIComponent(`Salut Marc, tu peux me préparer 5 idées d'articles pour mon blog ${siteName} ?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.placeholderLink}
            >
              Lui demander par WhatsApp →
            </a>
          </div>
        )}

        {!ideas.error && ideas.data === null && (
          <div style={styles.placeholder}>Chargement des idées…</div>
        )}

        {!ideas.error && aFaireIdeas.length === 0 && ideas.data !== null && (
          <div style={styles.placeholder}>
            Aucune idée en attente. Cliquez "+ Nouvelle idée" ou demandez-en à Marc.
          </div>
        )}

        {aFaireIdeas.length > 0 && (
          <div style={styles.cardList}>
            {aFaireIdeas.map((idea) => {
              const realIdx = (ideas.data?.ideas || []).indexOf(idea);
              const isEditing = editingIdeaIdx === realIdx;
              return (
                <div key={realIdx} style={styles.card}>
                  {isEditing ? (
                    <input
                      autoFocus
                      defaultValue={idea.title}
                      style={styles.inlineInput}
                      onBlur={(e) => renameIdea(realIdx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        if (e.key === 'Escape') setEditingIdeaIdx(null);
                      }}
                    />
                  ) : (
                    <div
                      style={styles.cardTitle}
                      onClick={() => setEditingIdeaIdx(realIdx)}
                      title="Cliquer pour renommer"
                    >
                      {idea.title}
                    </div>
                  )}
                  {idea.source && <div style={styles.cardSource}>{idea.source}</div>}
                  {idea.notes && <div style={styles.cardNotes}>{idea.notes}</div>}
                  <div style={styles.cardActions}>
                    <a
                      href={whatsappUrl(idea.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.waBtn}
                    >
                      Vocal Marc
                    </a>
                    <button
                      type="button"
                      onClick={() => startWritingSelf(idea)}
                      style={styles.btnGhost}
                    >
                      J'écris
                    </button>
                    <button
                      type="button"
                      onClick={() => skipIdea(realIdx)}
                      style={styles.btnDanger}
                      disabled={busy}
                    >
                      🗑 Skipper
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. PUBLIÉS */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>🌐 Mes articles publiés</h2>

        {articlesLoading && <div style={styles.placeholder}>Chargement…</div>}

        {!articlesLoading && published.length === 0 && (
          <div style={styles.placeholder}>Aucun article publié pour le moment.</div>
        )}

        {!articlesLoading && published.length > 0 && (
          <div style={styles.articleList}>
            {published.map((a) => (
              <div key={a.name} style={styles.articleCard}>
                <a href={`#/collection/blog/${a.slug}`} style={styles.articleLink}>
                  <div style={styles.articleTitle}>{a.data.title || a.slug}</div>
                  <div style={styles.articleMeta}>
                    {a.data.category && <span style={styles.articleCategory}>{a.data.category}</span>}
                    {a.data.date && <span>{formatDateFr(a.data.date)}</span>}
                  </div>
                </a>
                <div style={styles.menuWrap} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    style={styles.btnIcon}
                    disabled={busy}
                    onClick={() => setOpenMenuFor(openMenuFor === a.name ? null : a.name)}
                    aria-haspopup="menu"
                    aria-expanded={openMenuFor === a.name}
                    title="Actions"
                  >
                    ⋯
                  </button>
                  {openMenuFor === a.name && (
                    <div style={styles.menu} role="menu">
                      <a
                        href={siteUrl ? `${siteUrl}/blog/${a.slug}` : `/blog/${a.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.menuItem}
                        onClick={() => setOpenMenuFor(null)}
                      >
                        🔗 Voir sur le site
                      </a>
                      <a
                        href={`#/collection/blog/${a.slug}`}
                        style={styles.menuItem}
                        onClick={() => setOpenMenuFor(null)}
                      >
                        ✏️ Modifier l'article
                      </a>
                      <button
                        type="button"
                        style={styles.menuItemDanger}
                        disabled={busy}
                        onClick={() => {
                          setOpenMenuFor(null);
                          unpublish(a);
                        }}
                      >
                        ↩ Dépublier (repasse en brouillon)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <a href="#/collection/blog" style={styles.manageLink}>
          Gérer tous mes articles →
        </a>
      </section>

      {/* 5. ARCHIVE (collapse) */}
      {archiveIdeas.length > 0 && (
        <section style={styles.section}>
          <button
            type="button"
            style={styles.archiveToggle}
            onClick={() => setShowArchive((v) => !v)}
          >
            {showArchive ? '▾' : '▸'} 🗄 Idées archivées ({archiveIdeas.length})
          </button>
          {showArchive && (
            <div style={styles.archiveList}>
              {archiveIdeas.map((idea) => {
                const realIdx = (ideas.data?.ideas || []).indexOf(idea);
                return (
                  <div key={realIdx} style={styles.archiveCard}>
                    <div style={styles.archiveTitle}>{idea.title}</div>
                    <button
                      type="button"
                      style={styles.btnGhostSmall}
                      disabled={busy}
                      onClick={() => restoreIdea(realIdx)}
                    >
                      ↩ Restaurer
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      <div style={styles.contactFooter}>
        Une question sur votre blog ?{' '}
        <a
          href={`https://wa.me/${marcWhatsapp}?text=${encodeURIComponent('Bonjour Marc, une question sur mon blog.')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.contactLink}
        >
          Contacter Marc par WhatsApp
        </a>
      </div>

      {/* Modal date picker */}
      {scheduleModal && (
        <ScheduleModal
          article={scheduleModal}
          onClose={() => setScheduleModal(null)}
          onSubmit={(value) => submitSchedule(scheduleModal, value)}
          busy={busy}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={styles.toast}>
          <span>{toast.message}</span>
          {toast.href && (
            <a href={toast.href} target="_blank" rel="noopener noreferrer" style={styles.toastLink}>
              {toast.hrefLabel || 'Voir'} →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ───── Sous-composants ─────

function KpiBadge({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={styles.kpiBadge}>
      <span style={styles.kpiIcon}>{icon}</span>
      <span style={styles.kpiValue}>{value}</span>
      <span style={styles.kpiLabel}>{label}</span>
    </div>
  );
}

function ScheduleModal({
  article,
  onClose,
  onSubmit,
  busy,
}: {
  article: ArticleEntry;
  onClose: () => void;
  onSubmit: (value: string) => void;
  busy: boolean;
}) {
  const initial = article.data.publish_at
    ? (() => {
        const d = new Date(article.data.publish_at);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : defaultPickerValue();
  const [value, setValue] = useState(initial);

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>Programmer la publication</h3>
        <p style={styles.modalSubtitle}>{article.data.title || article.slug}</p>
        <label style={styles.modalLabel}>
          Date et heure
          <input
            type="datetime-local"
            value={value}
            min={pickerMin()}
            step={1800}
            onChange={(e) => setValue(e.target.value)}
            style={styles.modalInput}
          />
        </label>
        <p style={styles.modalHelp}>
          L'article apparaîtra automatiquement à cette date (granularité ~30 min).
        </p>
        <div style={styles.modalActions}>
          <button type="button" style={styles.btnGhost} onClick={onClose} disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            style={styles.btnPrimary}
            disabled={busy || !value}
            onClick={() => onSubmit(value)}
          >
            Programmer
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },

  kpis: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '0.625rem',
    marginBottom: '1.5rem',
  },
  kpiBadge: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '0.875rem 1rem',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    gap: '2px',
  },
  kpiIcon: { fontSize: '1.125rem', marginBottom: '0.125rem' },
  kpiValue: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', lineHeight: 1 },
  kpiLabel: { fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.04em' },

  section: { marginBottom: '1.75rem' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' },
  sectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#475569',
    margin: 0,
  },
  addBtn: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },

  placeholder: {
    background: '#fff',
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '1.25rem',
    fontSize: '0.875rem',
    color: '#64748b',
    textAlign: 'center' as const,
    lineHeight: 1.55,
  },
  placeholderLink: {
    display: 'inline-block',
    marginTop: '0.5rem',
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },

  cardList: { display: 'flex', flexDirection: 'column' as const, gap: '0.625rem' },
  card: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
  },
  cardScheduled: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
  },
  cardTitle: { fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4, cursor: 'pointer' },
  cardMeta: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' },
  cardMetaScheduled: { fontSize: '0.8125rem', color: '#78350f', marginTop: '4px' },
  cardSource: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' },
  cardNotes: { fontSize: '0.8125rem', color: '#64748b', marginTop: '0.375rem', fontStyle: 'italic', lineHeight: 1.5 },
  cardActions: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const, marginTop: '0.875rem' },

  btnPrimary: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSuccess: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fff',
    background: '#16a34a',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnGhost: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnGhostSmall: {
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  btnDanger: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#b91c1c',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  btnIcon: {
    width: '32px',
    height: '32px',
    fontSize: '1.125rem',
    color: '#94a3b8',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  },
  waBtn: {
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#fff',
    background: '#25d366',
    borderRadius: '8px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    border: 'none',
    cursor: 'pointer',
  },

  inlineInput: {
    width: '100%',
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#0f172a',
    border: '1px solid #2563eb',
    borderRadius: '6px',
    padding: '0.375rem 0.5rem',
    outline: 'none',
  },

  articleList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  articleCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 0.5rem 0.75rem 1rem',
  },
  articleLink: {
    flex: 1,
    textDecoration: 'none',
    color: 'inherit',
    minWidth: 0,
  },
  articleTitle: { fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' },
  articleMeta: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  },
  articleCategory: {
    background: '#f1f5f9',
    color: '#475569',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 500,
  },
  manageLink: {
    display: 'inline-block',
    marginTop: '0.875rem',
    fontSize: '0.8125rem',
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },

  archiveToggle: {
    width: '100%',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.625rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#475569',
    textAlign: 'left' as const,
    cursor: 'pointer',
  },
  archiveList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
    marginTop: '0.5rem',
  },
  archiveCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    gap: '0.5rem',
  },
  archiveTitle: { fontSize: '0.8125rem', color: '#475569', flex: 1, minWidth: 0 },

  contactFooter: { textAlign: 'center' as const, fontSize: '0.8125rem', color: '#94a3b8', padding: '1rem 0' },
  contactLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },

  modalOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    padding: '1.5rem',
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  modalTitle: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem' },
  modalSubtitle: { fontSize: '0.875rem', color: '#64748b', margin: '0 0 1.25rem' },
  modalLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.375rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#334155',
  },
  modalInput: {
    fontSize: '0.9375rem',
    padding: '0.5rem 0.625rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontFamily: 'inherit',
  },
  modalHelp: { fontSize: '0.75rem', color: '#94a3b8', margin: '0.5rem 0 1rem' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' },

  menuWrap: { position: 'relative' as const, flexShrink: 0 },
  menu: {
    position: 'absolute' as const,
    right: 0,
    top: 'calc(100% + 4px)',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 12px 30px rgba(15,23,42,0.15)',
    minWidth: '220px',
    padding: '0.25rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    zIndex: 50,
  },
  menuItem: {
    display: 'block',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: '#1e293b',
    textDecoration: 'none',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
  menuItemDanger: {
    display: 'block',
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: '#b91c1c',
    textDecoration: 'none',
    borderRadius: '6px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left' as const,
    fontWeight: 500,
  },

  toast: {
    position: 'fixed' as const,
    bottom: '1.5rem',
    right: '1.5rem',
    background: '#0f172a',
    color: '#fff',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.875rem',
    boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    zIndex: 1000,
    maxWidth: '440px',
  },
  toastLink: { color: '#93c5fd', textDecoration: 'underline', fontWeight: 600 },
};
