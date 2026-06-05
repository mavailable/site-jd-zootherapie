import { useState, useEffect } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useContent } from './hooks/useContent';
import { navigate, useToastContext } from './CmsApp';
import { t, locale, intlLocale } from './locales';
import { articleState, sortTimestamp, type ArticleState } from './blogHelpers';

interface BlogTabProps {
  config: CmsConfig;
}

interface BlogIdea {
  title: string;
  source?: string;
  notes?: string;
  status?: string;
}

interface BlogArticleEntry {
  name: string;
  title?: string;
  date?: string;
  category?: string;
  state?: ArticleState;
  publish_at?: string;
}

const IDEAS_PATH = 'src/content/blog-ideas/index.json';
const MARC_WHATSAPP = '33688766648';

function formatDate(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    return new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function formatDateTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const BADGE_STYLES: Record<ArticleState, { bg: string; color: string; key: string }> = {
  draft: { bg: '#f1f5f9', color: '#475569', key: 'badgeDraft' },
  scheduled: { bg: '#fef3c7', color: '#a16207', key: 'badgeScheduled' },
  published: { bg: '#dcfce7', color: '#15803d', key: 'badgePublished' },
};

function StateBadge({ state }: { state: ArticleState }) {
  const s = BADGE_STYLES[state];
  return (
    <span style={{ ...styles.stateBadge, background: s.bg, color: s.color }}>
      {t(s.key)}
    </span>
  );
}

function whatsappUrl(title: string): string {
  const text = locale === 'en'
    ? `Hi Marc, I'd like an article on my blog: "${title}". I'll send you a voice note with an anecdote / my take on the topic.`
    : `Bonjour Marc, j'aimerais un article sur mon blog : "${title}". Je t'envoie un vocal avec une anecdote / mon avis sur le sujet.`;
  return `https://wa.me/${MARC_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function startWritingSelf(idea: BlogIdea) {
  try {
    sessionStorage.setItem('blog_new_prefill', JSON.stringify({
      title: idea.title,
    }));
  } catch {
    // silent
  }
  navigate('#/collection/blog/_new');
}

function sendVocalForIdea(idea: BlogIdea) {
  try {
    sessionStorage.setItem('vocaux_prefill', JSON.stringify({
      sujet: idea.title,
      categorie: 'idee-article',
    }));
  } catch {
    // silent
  }
  navigate('#/vocaux');
}

export function BlogTab({ config }: BlogTabProps) {
  const { fetchFile, fetchList, saveFile } = useContent();
  const { addToast } = useToastContext();
  const [allIdeas, setAllIdeas] = useState<BlogIdea[] | null>(null);
  const [ideasSha, setIdeasSha] = useState<string | null>(null);
  const [skippingIdx, setSkippingIdx] = useState<number | null>(null);
  const [ideasError, setIdeasError] = useState(false);
  const [articles, setArticles] = useState<BlogArticleEntry[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  const siteName = config.siteName;
  const marcWhatsapp = config.site?.contactMarc?.whatsapp || MARC_WHATSAPP;

  // Vue dérivée : 5 premières idées à faire (l'index renvoyé correspond à allIdeas)
  const visibleIdeas: Array<{ idea: BlogIdea; absoluteIdx: number }> = [];
  if (allIdeas) {
    for (let i = 0; i < allIdeas.length && visibleIdeas.length < 5; i++) {
      const it = allIdeas[i];
      if (!it.status || it.status === 'a-faire') {
        visibleIdeas.push({ idea: it, absoluteIdx: i });
      }
    }
  }

  useEffect(() => {
    fetchFile(IDEAS_PATH)
      .then((data) => {
        const raw = data.content?.ideas;
        setIdeasSha(data.sha);
        if (Array.isArray(raw)) {
          setAllIdeas(raw as BlogIdea[]);
        } else {
          setAllIdeas([]);
        }
      })
      .catch(() => {
        setIdeasError(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function skipIdea(absoluteIdx: number) {
    if (!allIdeas || skippingIdx !== null) return;
    const target = allIdeas[absoluteIdx];
    if (!target) return;
    if (!window.confirm(t('skipIdeaConfirm'))) return;

    setSkippingIdx(absoluteIdx);
    const previous = allIdeas;
    const previousSha = ideasSha;
    const next = allIdeas.map((it, i) =>
      i === absoluteIdx ? { ...it, status: 'refusee' } : it
    );
    setAllIdeas(next); // optimiste

    try {
      const result = await saveFile(
        IDEAS_PATH,
        { ideas: next },
        ideasSha || undefined,
        `[blog] idée passée : ${target.title}`
      );
      setIdeasSha(result.sha);
    } catch {
      setAllIdeas(previous);
      setIdeasSha(previousSha);
      addToast(t('skipIdeaError'), 'error');
    } finally {
      setSkippingIdx(null);
    }
  }

  useEffect(() => {
    const path = config.collections?.blog?.path || 'src/content/blog';
    fetchList(path)
      .then(async (files) => {
        const jsonFiles = files.filter((f) => f.name.endsWith('.json'));
        // On charge le contenu de tous les articles pour pouvoir trier par DATE
        // (publish_at futur prioritaire, sinon date) et non par nom de fichier.
        const enrichedAll = await Promise.all(
          jsonFiles.map(async (f) => {
            try {
              const d = await fetchFile(`${path}/${f.name}`);
              const c = d.content || {};
              return {
                name: f.name,
                title: (c.title as string) || f.name.replace('.json', ''),
                date: c.date as string | undefined,
                category: c.category as string | undefined,
                publish_at: c.publish_at as string | undefined,
                state: articleState({
                  draft: c.draft as boolean | undefined,
                  publish_at: c.publish_at as string | undefined,
                }),
                _ts: sortTimestamp({ publish_at: c.publish_at, date: c.date }),
              };
            } catch {
              return { name: f.name, _ts: 0 };
            }
          })
        );
        const latest = enrichedAll
          .sort((a, b) => (b._ts as number) - (a._ts as number))
          .slice(0, 3)
          .map(({ _ts, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
        setArticles(latest);
        setArticlesLoading(false);
      })
      .catch(() => {
        setArticlesLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={styles.fadeIn}>

      {/* ── Section 1 : Idées d'articles ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t('ideasTitle')}</h2>
        <p style={styles.sectionIntro}>
          {t('ideasIntro')}
        </p>

        {ideasError && (
          <div style={styles.placeholder}>
            {t('ideasPlaceholderError')}
            <br />
            <a
              href={`https://wa.me/${marcWhatsapp}?text=${encodeURIComponent(locale === 'en' ? `Hi Marc, can you prepare 5 article ideas for my blog ${siteName}?` : `Salut Marc, tu peux me préparer 5 idées d'articles pour mon blog ${siteName} ?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.placeholderLink}
            >
              {t('ideasAskMarcWhatsapp')}
            </a>
          </div>
        )}

        {!ideasError && allIdeas === null && (
          <div style={styles.placeholder}>{t('ideasLoading')}</div>
        )}

        {!ideasError && allIdeas !== null && visibleIdeas.length === 0 && (
          <div style={styles.placeholder}>
            {t('ideasPlaceholderEmpty')}
          </div>
        )}

        {!ideasError && visibleIdeas.length > 0 && (
          <div style={styles.ideaList}>
            {visibleIdeas.map(({ idea, absoluteIdx }, i) => {
              const isSkipping = skippingIdx === absoluteIdx;
              return (
                <div key={absoluteIdx} style={styles.ideaCard}>
                  <button
                    type="button"
                    onClick={() => skipIdea(absoluteIdx)}
                    disabled={isSkipping || skippingIdx !== null}
                    title={t('skipIdea')}
                    aria-label={t('skipIdea')}
                    style={{
                      ...styles.skipBtn,
                      opacity: isSkipping ? 0.5 : 1,
                      cursor: isSkipping ? 'wait' : 'pointer',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 14 14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                    >
                      <path d="M3 3l8 8M11 3l-8 8" />
                    </svg>
                  </button>
                  <div style={styles.ideaHeader}>
                    <span style={styles.ideaNumber}>{i + 1}</span>
                    <div style={styles.ideaBody}>
                      <div style={styles.ideaTitle}>{idea.title}</div>
                      {idea.source && <div style={styles.ideaSource}>{idea.source}</div>}
                      {idea.notes && <div style={styles.ideaNotes}>{idea.notes}</div>}
                    </div>
                  </div>

                  <div style={styles.ideaActions}>
                    {config.vocaux?.enabled ? (
                      <button
                        type="button"
                        onClick={() => sendVocalForIdea(idea)}
                        style={styles.waBtn}
                      >
                        {t('askMarcVoice')}
                      </button>
                    ) : (
                      <a
                        href={whatsappUrl(idea.title)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={styles.waBtn}
                      >
                        {t('askMarcVoice')}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => startWritingSelf(idea)}
                      style={styles.writeBtn}
                    >
                      {t('writeMyself')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Section 2 : Articles publiés ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>{t('publishedArticles')}</h2>

        {articlesLoading && <div style={styles.placeholder}>{t('articlesLoading')}</div>}

        {!articlesLoading && articles.length === 0 && (
          <div style={styles.placeholder}>
            {t('noArticleYet')}
          </div>
        )}

        {!articlesLoading && articles.length > 0 && (
          <div style={styles.articleList}>
            {articles.map((a) => (
              <a
                key={a.name}
                href={`#/collection/blog/${a.name.replace('.json', '')}`}
                style={styles.articleCard}
              >
                <div style={styles.articleTitle}>{a.title}</div>
                <div style={styles.articleMeta}>
                  {a.state && <StateBadge state={a.state} />}
                  {a.category && <span style={styles.articleCategory}>{a.category}</span>}
                  {a.state === 'scheduled' && a.publish_at
                    ? <span>{t('scheduledFor', { date: formatDateTime(a.publish_at) })}</span>
                    : a.date && <span>{formatDate(a.date)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}

        <a href="#/collection/blog" style={styles.manageLink}>
          {t('manageAllArticles')}
        </a>
      </section>

      <div style={styles.contactFooter}>
        {t('blogQuestion')}{' '}
        <a
          href={`https://wa.me/${marcWhatsapp}?text=${encodeURIComponent(locale === 'en' ? 'Hi Marc, a question about my blog.' : 'Bonjour Marc, une question sur mon blog.')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.contactLink}
        >
          {t('contactMarcWhatsapp')}
        </a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  fadeIn: { animation: 'fadeIn 0.25s ease-out' },
  section: { marginBottom: '2rem' },
  sectionTitle: {
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  sectionIntro: {
    fontSize: '0.875rem',
    color: '#475569',
    margin: '0 0 1rem',
    lineHeight: 1.55,
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

  // Ideas
  ideaList: { display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  ideaCard: {
    position: 'relative' as const,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
  },
  skipBtn: {
    position: 'absolute' as const,
    top: '0.5rem',
    right: '0.5rem',
    width: '24px',
    height: '24px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    borderRadius: '50%',
    padding: 0,
    transition: 'background 120ms ease, color 120ms ease',
  },
  ideaHeader: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.875rem', paddingRight: '1.5rem' },
  ideaNumber: {
    flexShrink: 0,
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    background: '#eff6ff',
    color: '#2563eb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
  },
  ideaBody: { flex: 1, minWidth: 0 },
  ideaTitle: { fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.4 },
  ideaSource: { fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' },
  ideaNotes: { fontSize: '0.8125rem', color: '#64748b', marginTop: '0.375rem', fontStyle: 'italic', lineHeight: 1.5 },
  ideaActions: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  waBtn: {
    flex: '1 1 auto',
    minWidth: '160px',
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
  writeBtn: {
    flex: '1 1 auto',
    minWidth: '140px',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center' as const,
  },

  // Articles
  articleList: { display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' },
  articleCard: {
    display: 'block',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    textDecoration: 'none',
    color: 'inherit',
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
  stateBadge: {
    padding: '2px 8px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.02em',
  },
  manageLink: {
    display: 'inline-block',
    marginTop: '0.875rem',
    fontSize: '0.8125rem',
    color: '#2563eb',
    fontWeight: 600,
    textDecoration: 'none',
  },

  contactFooter: { textAlign: 'center' as const, fontSize: '0.8125rem', color: '#94a3b8', padding: '1rem 0' },
  contactLink: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
};
