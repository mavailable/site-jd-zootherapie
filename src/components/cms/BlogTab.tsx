import { useState, useEffect } from 'react';
import type { CmsConfig } from '../../../cms.types';
import { useContent } from './hooks/useContent';
import { navigate } from './CmsApp';

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
}

const IDEAS_PATH = 'src/content/blog-ideas/index.json';
const MARC_WHATSAPP = '33688766648';

function formatDate(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function whatsappUrl(title: string): string {
  const text =
    `Bonjour Marc, j'aimerais un article sur mon blog : "${title}". ` +
    `Je t'envoie un vocal avec une anecdote / mon avis sur le sujet.`;
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

export function BlogTab({ config }: BlogTabProps) {
  const { fetchFile, fetchList } = useContent();
  const [ideas, setIdeas] = useState<BlogIdea[] | null>(null);
  const [ideasError, setIdeasError] = useState(false);
  const [articles, setArticles] = useState<BlogArticleEntry[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);

  const siteName = config.siteName;
  const marcWhatsapp = config.site?.contactMarc?.whatsapp || MARC_WHATSAPP;

  useEffect(() => {
    fetchFile(IDEAS_PATH)
      .then((data) => {
        const raw = data.content?.ideas;
        if (Array.isArray(raw)) {
          const pending = (raw as BlogIdea[]).filter((i) => !i.status || i.status === 'a-faire');
          setIdeas(pending.slice(0, 5));
        } else {
          setIdeas([]);
        }
      })
      .catch(() => {
        setIdeasError(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const path = config.collections?.blog?.path || 'src/content/blog';
    fetchList(path)
      .then(async (files) => {
        const jsonFiles = files.filter((f) => f.name.endsWith('.json'));
        const sorted = [...jsonFiles].sort((a, b) => b.name.localeCompare(a.name));
        const latest = sorted.slice(0, 3);
        const enriched = await Promise.all(
          latest.map(async (f) => {
            try {
              const d = await fetchFile(`${path}/${f.name}`);
              return {
                name: f.name,
                title: (d.content?.title as string) || f.name.replace('.json', ''),
                date: d.content?.date as string | undefined,
                category: d.content?.category as string | undefined,
              };
            } catch {
              return { name: f.name };
            }
          })
        );
        setArticles(enriched);
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
        <h2 style={styles.sectionTitle}>Vos prochaines idées d'articles</h2>
        <p style={styles.sectionIntro}>
          Marc a préparé ces sujets pour vous. Deux options pour chaque idée :
          lui envoyer un vocal WhatsApp (il rédige l'article), ou l'écrire vous-même.
        </p>

        {ideasError && (
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

        {!ideasError && ideas === null && (
          <div style={styles.placeholder}>Chargement des idées…</div>
        )}

        {!ideasError && ideas !== null && ideas.length === 0 && (
          <div style={styles.placeholder}>
            Toutes les idées ont été exploitées. Marc va en préparer de nouvelles.
          </div>
        )}

        {!ideasError && ideas && ideas.length > 0 && (
          <div style={styles.ideaList}>
            {ideas.map((idea, i) => (
              <div key={i} style={styles.ideaCard}>
                <div style={styles.ideaHeader}>
                  <span style={styles.ideaNumber}>{i + 1}</span>
                  <div style={styles.ideaBody}>
                    <div style={styles.ideaTitle}>{idea.title}</div>
                    {idea.source && <div style={styles.ideaSource}>{idea.source}</div>}
                    {idea.notes && <div style={styles.ideaNotes}>{idea.notes}</div>}
                  </div>
                </div>

                <div style={styles.ideaActions}>
                  <a
                    href={whatsappUrl(idea.title)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.waBtn}
                  >
                    Demander à Marc (vocal)
                  </a>
                  <button
                    type="button"
                    onClick={() => startWritingSelf(idea)}
                    style={styles.writeBtn}
                  >
                    J'écris moi-même
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2 : Articles publiés ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Mes articles publiés</h2>

        {articlesLoading && <div style={styles.placeholder}>Chargement…</div>}

        {!articlesLoading && articles.length === 0 && (
          <div style={styles.placeholder}>
            Aucun article publié pour le moment.
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
                  {a.category && <span style={styles.articleCategory}>{a.category}</span>}
                  {a.date && <span>{formatDate(a.date)}</span>}
                </div>
              </a>
            ))}
          </div>
        )}

        <a href="#/collection/blog" style={styles.manageLink}>
          Gérer tous mes articles →
        </a>
      </section>

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
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
  },
  ideaHeader: { display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.875rem' },
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
