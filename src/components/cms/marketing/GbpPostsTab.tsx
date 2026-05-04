import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';

// ─── Types ──────────────────────────────────────────────────────

type CtaType = 'LEARN_MORE' | 'BOOK' | 'ORDER' | 'SHOP' | 'SIGN_UP' | 'CALL';

interface BlogArticle {
  slug: string;
  title: string;
  category: string;
  date: string;
  excerpt: string;
  image: string;
  url: string;
}

interface GbpPost {
  id: string;
  publishedAt: string;
  text: string;
  cta: CtaType;
  ctaUrl: string;
  image: string;
  sourceArticleSlug: string;
  sourceArticleTitle: string;
  views?: number;
  clicks?: number;
}

interface DraftPost {
  text: string;
  cta: CtaType;
  ctaUrl: string;
  image: string;
  sourceArticle: BlogArticle;
}

// ─── Mock data — articles réels du site ─────────────────────────
// Source : src/content/blog/*.json (lecture statique pour le mock,
// remplacé par fetch /api/blog/list en mode live)

const MOCK_ARTICLES: BlogArticle[] = [
  {
    slug: 'comment-se-passe-accompagnement-mediation-animale',
    title: 'Comment se passe un accompagnement en médiation animale',
    category: 'Méthode',
    date: '2026-04-20',
    excerpt:
      "On me pose souvent la question : « Concrètement, ça se passe comment ? ». Un accompagnement en médiation animale, quand il est fait correctement, c'est un programme structuré, pensé avec les équipes et construit autour d'objectifs précis et mesurables.",
    image: '/images/blog/article-001-hero.webp',
    url: 'https://jdzootherapeute.fr/blog/comment-se-passe-accompagnement-mediation-animale/',
  },
  {
    slug: 'alzheimer-et-mediation-animale',
    title: 'Alzheimer et médiation animale : retrouver des moments de présence',
    category: 'Public',
    date: '2026-04-12',
    excerpt:
      "Pour une personne atteinte d'Alzheimer, les objectifs ne sont pas de soigner la maladie. Ils sont de retrouver des moments de qualité, de présence, de calme. La médiation animale crée ces moments-là, à domicile, en EHPAD, en accueil de jour.",
    image: '/images/blog/article-002-hero.webp',
    url: 'https://jdzootherapeute.fr/blog/alzheimer-et-mediation-animale/',
  },
  {
    slug: 'mon-enfant-a-peur-des-chiens',
    title: 'Mon enfant a peur des chiens : que faire ?',
    category: 'Conseils parents',
    date: '2026-04-05',
    excerpt:
      "La peur des chiens chez l'enfant est plus fréquente qu'on ne le pense. La médiation animale propose une approche douce, progressive, qui ne force jamais l'enfant. On part de là où il en est, et on avance à son rythme.",
    image: '/images/blog/article-003-hero.webp',
    url: 'https://jdzootherapeute.fr/blog/mon-enfant-a-peur-des-chiens/',
  },
  {
    slug: 'trois-ans-un-lapin-et-un-premier-mot',
    title: 'Trois ans, un lapin, et un premier mot',
    category: "Récits d'intervention",
    date: '2026-03-22',
    excerpt:
      "Le récit d'une séance avec un petit garçon de 3 ans qui ne parlait pas encore. Ce jour-là, face au lapin Tap-Tap, il a prononcé son premier mot. Ce moment-là ne s'oublie pas, ni pour la maman, ni pour moi.",
    image: '/images/blog/article-004-hero.webp',
    url: 'https://jdzootherapeute.fr/blog/trois-ans-un-lapin-et-un-premier-mot/',
  },
  {
    slug: 'zootherapie-calinotherapie-differences',
    title: 'Zoothérapie ou câlinothérapie : quelles différences ?',
    category: 'Pédagogie',
    date: '2026-03-08',
    excerpt:
      "Beaucoup de gens confondent les deux. La câlinothérapie, c'est un moment de bien-être avec un animal. La zoothérapie, c'est un programme avec des objectifs thérapeutiques mesurables, sur la durée. Les deux ont leur valeur, mais ce n'est pas la même chose.",
    image: '/images/blog/article-005-hero.webp',
    url: 'https://jdzootherapeute.fr/blog/zootherapie-calinotherapie-differences/',
  },
];

const MOCK_HISTORY: GbpPost[] = [
  {
    id: 'gbp-2026-04-22-001',
    publishedAt: '2026-04-22',
    text: "📖 Nouvel article : « Comment se passe un accompagnement en médiation animale ? »\n\nUn programme structuré, des objectifs mesurables, des cycles de 5 séances. Je vous explique ma méthode étape par étape — de l'identification des objectifs au bilan de cycle.\n\nÀ lire si vous vous demandez à quoi ressemble concrètement un accompagnement en zoothérapie en Moselle.",
    cta: 'LEARN_MORE',
    ctaUrl:
      'https://jdzootherapeute.fr/blog/comment-se-passe-accompagnement-mediation-animale/',
    image: '/images/blog/article-001-hero.webp',
    sourceArticleSlug: 'comment-se-passe-accompagnement-mediation-animale',
    sourceArticleTitle: 'Comment se passe un accompagnement en médiation animale',
    views: 142,
    clicks: 18,
  },
  {
    id: 'gbp-2026-04-14-001',
    publishedAt: '2026-04-14',
    text: "🐾 Article du jour : « Alzheimer et médiation animale »\n\nQuand on accompagne une personne atteinte d'Alzheimer, on ne cherche pas à soigner la maladie. On cherche à retrouver des moments de présence, de calme, de qualité.\n\nLa médiation animale crée ces moments-là, à domicile ou en EHPAD. Lecture pour les aidants et les équipes médico-sociales.",
    cta: 'LEARN_MORE',
    ctaUrl: 'https://jdzootherapeute.fr/blog/alzheimer-et-mediation-animale/',
    image: '/images/blog/article-002-hero.webp',
    sourceArticleSlug: 'alzheimer-et-mediation-animale',
    sourceArticleTitle: 'Alzheimer et médiation animale',
    views: 203,
    clicks: 27,
  },
  {
    id: 'gbp-2026-04-07-001',
    publishedAt: '2026-04-07',
    text: "👧 Si votre enfant a peur des chiens, vous n'êtes pas seuls. C'est plus fréquent qu'on ne le pense, et ça se travaille.\n\nDans mon dernier article, je raconte comment la médiation animale propose une approche douce, progressive, qui ne force jamais l'enfant. On part d'où il en est, on avance à son rythme.\n\nÀ partager avec les parents qui se posent la question.",
    cta: 'LEARN_MORE',
    ctaUrl: 'https://jdzootherapeute.fr/blog/mon-enfant-a-peur-des-chiens/',
    image: '/images/blog/article-003-hero.webp',
    sourceArticleSlug: 'mon-enfant-a-peur-des-chiens',
    sourceArticleTitle: 'Mon enfant a peur des chiens',
    views: 178,
    clicks: 22,
  },
];

// ─── Génération mock du post depuis un article ──────────────────

function generatePostFromArticle(article: BlogArticle): DraftPost {
  // Templates de hooks pour varier le ton (en live, généré par LLM)
  const hooks = [
    `📖 Nouvel article : « ${article.title} »`,
    `🐾 Article à lire : « ${article.title} »`,
    `Cette semaine sur le blog : « ${article.title} »`,
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const closer =
    "À lire si vous vous demandez comment la médiation animale peut vous aider — ou aider quelqu'un que vous accompagnez.";

  const text = `${hook}\n\n${article.excerpt}\n\n${closer}`;

  return {
    text,
    cta: 'LEARN_MORE',
    ctaUrl: article.url,
    image: article.image,
    sourceArticle: article,
  };
}

// ─── Tab principal ──────────────────────────────────────────────

export function GbpPostsTab() {
  const [draft, setDraft] = useState<DraftPost | null>(null);
  const [history, setHistory] = useState<GbpPost[]>(MOCK_HISTORY);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  const articles = useMemo(() => MOCK_ARTICLES, []);
  const lastPublishedSlugs = useMemo(
    () => new Set(history.map((h) => h.sourceArticleSlug)),
    [history],
  );

  function openDraft(article: BlogArticle) {
    setDraft(generatePostFromArticle(article));
  }

  function publishDraft() {
    if (!draft) return;
    setPublishing(true);
    // Simulation d'un appel API GBP — délai 800ms
    setTimeout(() => {
      const newPost: GbpPost = {
        id: `gbp-${new Date().toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 7)}`,
        publishedAt: new Date().toISOString().slice(0, 10),
        text: draft.text,
        cta: draft.cta,
        ctaUrl: draft.ctaUrl,
        image: draft.image,
        sourceArticleSlug: draft.sourceArticle.slug,
        sourceArticleTitle: draft.sourceArticle.title,
      };
      setHistory((prev) => [newPost, ...prev]);
      setDraft(null);
      setPublishing(false);
      setToast({
        type: 'success',
        msg: 'Post publié sur Google Business Profile (mode demo — aucun appel API réel).',
      });
      setTimeout(() => setToast(null), 4000);
    }, 800);
  }

  function deletePost(id: string) {
    setHistory((prev) => prev.filter((p) => p.id !== id));
    setToast({ type: 'success', msg: 'Post supprimé de la fiche GBP (mode demo).' });
    setTimeout(() => setToast(null), 3000);
  }

  return (
    <section style={styles.container}>
      {/* Demo banner */}
      <div style={styles.demoBanner}>
        <span style={styles.demoBadge}>DEMO</span>
        <span>
          Cet onglet est en mode démonstration — aucun appel à l'API Google Business Profile
          n'est effectué. Le mode live sera activé après whitelist Google.
        </span>
      </div>

      {/* Hero */}
      <header style={styles.hero}>
        <div>
          <div style={styles.sectionLabel}>Marketing local</div>
          <h1 style={styles.title}>Posts Google Business Profile</h1>
          <p style={styles.subtitle}>
            Génère un post GBP à partir d'un article de blog. Publie en 1 clic sur ta fiche
            Google Business — entretient l'activité de la fiche et nourrit le local pack.
          </p>
        </div>
      </header>

      {/* KPI */}
      <div style={styles.statsGrid}>
        <KpiCard label="Articles disponibles" value={articles.length} color="#2563eb" />
        <KpiCard label="Posts publiés" value={history.length} color="#16a34a" />
        <KpiCard
          label="Vues cumulées (30j)"
          value={history.reduce((s, p) => s + (p.views ?? 0), 0)}
          color="#7c3aed"
        />
        <KpiCard
          label="Clics → site"
          value={history.reduce((s, p) => s + (p.clicks ?? 0), 0)}
          color="#ea580c"
        />
      </div>

      {/* Articles à publier */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Articles disponibles
          <span style={styles.sectionCount}>{articles.length}</span>
        </h2>
        <p style={styles.sectionIntro}>
          Sélectionne un article, ajuste le post généré, publie sur ta fiche GBP. Chaque article
          peut être republié sous un autre angle plus tard.
        </p>
        <div style={styles.articlesList}>
          {articles.map((article) => {
            const alreadyPublished = lastPublishedSlugs.has(article.slug);
            return (
              <article key={article.slug} style={styles.articleCard}>
                <div style={styles.articleThumb} aria-hidden="true">
                  <span style={styles.articleThumbEmoji}>📰</span>
                </div>
                <div style={styles.articleBody}>
                  <div style={styles.articleMeta}>
                    <span style={styles.articleCategory}>{article.category}</span>
                    <span style={styles.articleDate}>
                      {new Date(article.date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {alreadyPublished && (
                      <span style={styles.articleBadgePublished}>déjà publié sur GBP</span>
                    )}
                  </div>
                  <h3 style={styles.articleTitle}>{article.title}</h3>
                  <p style={styles.articleExcerpt}>{article.excerpt}</p>
                  <div style={styles.articleActions}>
                    <button type="button" onClick={() => openDraft(article)} style={styles.btnPrimary}>
                      Générer un post GBP →
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.btnSecondary}
                    >
                      Voir l'article
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Historique */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>
          Posts publiés
          <span style={styles.sectionCount}>{history.length}</span>
        </h2>
        {history.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>Aucun post publié pour le moment</div>
            <div style={styles.emptyText}>
              Sélectionne un article ci-dessus pour publier ton premier post GBP.
            </div>
          </div>
        ) : (
          <div style={styles.historyList}>
            {history.map((post) => (
              <div key={post.id} style={styles.historyCard}>
                <div style={styles.historyHeader}>
                  <div style={styles.historyDate}>
                    📅 Publié le{' '}
                    {new Date(post.publishedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => deletePost(post.id)}
                    style={styles.btnDelete}
                    aria-label="Supprimer ce post de la fiche GBP"
                  >
                    Supprimer
                  </button>
                </div>
                <div style={styles.historyText}>
                  {post.text.split('\n').map((line, i) => (
                    <p key={i} style={styles.historyTextLine}>
                      {line || ' '}
                    </p>
                  ))}
                </div>
                <div style={styles.historyMeta}>
                  <span style={styles.historyMetaItem}>
                    📎 {post.sourceArticleTitle}
                  </span>
                  <span style={styles.historyMetaItem}>
                    🎯 CTA : <strong>{ctaLabel(post.cta)}</strong>
                  </span>
                  {post.views !== undefined && (
                    <span style={styles.historyMetaItem}>
                      👁 {post.views} vues · 🔗 {post.clicks} clics
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Draft */}
      {draft && (
        <DraftModal
          draft={draft}
          onChange={setDraft}
          onPublish={publishDraft}
          onClose={() => !publishing && setDraft(null)}
          publishing={publishing}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            background: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: toast.type === 'success' ? '#166534' : '#991b1b',
            borderColor: toast.type === 'success' ? '#86efac' : '#fca5a5',
          }}
        >
          {toast.type === 'success' ? '✓' : '✗'} {toast.msg}
        </div>
      )}
    </section>
  );
}

// ─── Modal Draft ────────────────────────────────────────────────

interface DraftModalProps {
  draft: DraftPost;
  onChange: (d: DraftPost) => void;
  onPublish: () => void;
  onClose: () => void;
  publishing: boolean;
}

function DraftModal({ draft, onChange, onPublish, onClose, publishing }: DraftModalProps) {
  const charCount = draft.text.length;
  const overLimit = charCount > 1500;

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header style={styles.modalHeader}>
          <div>
            <div style={styles.modalLabel}>Nouveau post GBP</div>
            <h2 style={styles.modalTitle}>{draft.sourceArticle.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={styles.modalClose}
            aria-label="Fermer"
            disabled={publishing}
          >
            ✕
          </button>
        </header>

        <div style={styles.modalBody}>
          {/* Aperçu visuel GBP */}
          <div style={styles.gbpPreview}>
            <div style={styles.gbpPreviewLabel}>Aperçu sur Google Business Profile</div>
            <div style={styles.gbpPreviewCard}>
              <div style={styles.gbpPreviewImage} aria-hidden="true">
                <span style={styles.gbpPreviewImagePlaceholder}>🖼 {draft.image.split('/').pop()}</span>
              </div>
              <div style={styles.gbpPreviewBody}>
                <div style={styles.gbpPreviewBusiness}>JD Zoothérapie</div>
                <div style={styles.gbpPreviewText}>
                  {draft.text.split('\n').slice(0, 3).join(' ').slice(0, 180)}
                  {draft.text.length > 180 ? '…' : ''}
                </div>
                <div style={styles.gbpPreviewCtaWrap}>
                  <button type="button" style={styles.gbpPreviewCta}>
                    {ctaLabel(draft.cta)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Édition */}
          <label style={styles.fieldLabel}>
            <span style={styles.fieldLabelText}>Texte du post</span>
            <span
              style={{
                ...styles.charCounter,
                color: overLimit ? '#dc2626' : charCount > 1300 ? '#ea580c' : '#64748b',
              }}
            >
              {charCount} / 1500
            </span>
          </label>
          <textarea
            value={draft.text}
            onChange={(e) => onChange({ ...draft, text: e.target.value })}
            style={{
              ...styles.textarea,
              borderColor: overLimit ? '#dc2626' : '#cbd5e1',
            }}
            rows={10}
            disabled={publishing}
          />

          <div style={styles.fieldRow}>
            <div style={{ flex: 1 }}>
              <label style={styles.fieldLabel}>
                <span style={styles.fieldLabelText}>Bouton d'appel (CTA)</span>
              </label>
              <select
                value={draft.cta}
                onChange={(e) => onChange({ ...draft, cta: e.target.value as CtaType })}
                style={styles.select}
                disabled={publishing}
              >
                <option value="LEARN_MORE">En savoir plus</option>
                <option value="BOOK">Réserver</option>
                <option value="ORDER">Commander</option>
                <option value="SHOP">Acheter</option>
                <option value="SIGN_UP">S'inscrire</option>
                <option value="CALL">Appeler</option>
              </select>
            </div>
            <div style={{ flex: 2 }}>
              <label style={styles.fieldLabel}>
                <span style={styles.fieldLabelText}>URL cible du CTA</span>
              </label>
              <input
                type="url"
                value={draft.ctaUrl}
                onChange={(e) => onChange({ ...draft, ctaUrl: e.target.value })}
                style={styles.input}
                disabled={publishing}
              />
            </div>
          </div>
        </div>

        <footer style={styles.modalFooter}>
          <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={publishing}>
            Annuler
          </button>
          <button
            type="button"
            onClick={onPublish}
            style={{
              ...styles.btnPrimary,
              opacity: overLimit || publishing ? 0.5 : 1,
              cursor: overLimit || publishing ? 'not-allowed' : 'pointer',
            }}
            disabled={overLimit || publishing}
          >
            {publishing ? 'Publication en cours…' : 'Valider et publier sur GBP →'}
          </button>
        </footer>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function ctaLabel(cta: CtaType): string {
  const map: Record<CtaType, string> = {
    LEARN_MORE: 'En savoir plus',
    BOOK: 'Réserver',
    ORDER: 'Commander',
    SHOP: 'Acheter',
    SIGN_UP: "S'inscrire",
    CALL: 'Appeler',
  };
  return map[cta];
}

function KpiCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={styles.kpiCard}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, color }}>{value}</div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '1.5rem 1.25rem 3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  demoBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    color: '#713f12',
  },
  demoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#f59e0b',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
  },
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  sectionLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94a3b8',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.9375rem',
    color: '#475569',
    margin: '0.5rem 0 0',
    maxWidth: '720px',
    lineHeight: 1.5,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
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
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.1,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
  },
  sectionCount: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    background: '#f1f5f9',
    borderRadius: '999px',
    padding: '0.125rem 0.5rem',
  },
  sectionIntro: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.5,
  },
  articlesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  articleCard: {
    display: 'flex',
    gap: '1rem',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  articleThumb: {
    width: '88px',
    height: '88px',
    background: '#f1f5f9',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  articleThumbEmoji: {
    fontSize: '2rem',
  },
  articleBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    minWidth: 0,
  },
  articleMeta: {
    display: 'flex',
    gap: '0.625rem',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  articleCategory: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    background: '#dbeafe',
    color: '#1e40af',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  articleDate: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  articleBadgePublished: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    background: '#dcfce7',
    color: '#166534',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
  },
  articleTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
  },
  articleExcerpt: {
    fontSize: '0.8125rem',
    color: '#475569',
    margin: 0,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  articleActions: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.25rem',
    flexWrap: 'wrap',
  },
  btnPrimary: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnSecondary: {
    background: '#fff',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnDelete: {
    background: 'transparent',
    color: '#94a3b8',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  emptyState: {
    background: '#f8fafc',
    border: '1px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '2rem 1.5rem',
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.25rem',
  },
  emptyText: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  historyCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem 1.125rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  historyDate: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
  },
  historyText: {
    fontSize: '0.875rem',
    color: '#1e293b',
    lineHeight: 1.5,
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '8px',
    padding: '0.75rem 0.875rem',
  },
  historyTextLine: {
    margin: 0,
  },
  historyMeta: {
    display: 'flex',
    gap: '0.875rem',
    flexWrap: 'wrap',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  historyMetaItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    backdropFilter: 'blur(2px)',
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
    width: '100%',
    maxWidth: '720px',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.25rem 1.5rem 1rem',
    borderBottom: '1px solid #e2e8f0',
    gap: '1rem',
  },
  modalLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94a3b8',
    marginBottom: '0.25rem',
  },
  modalTitle: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
  },
  modalClose: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.25rem',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    lineHeight: 1,
  },
  modalBody: {
    padding: '1.25rem 1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
    borderBottomLeftRadius: '14px',
    borderBottomRightRadius: '14px',
  },
  gbpPreview: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.875rem',
  },
  gbpPreviewLabel: {
    fontSize: '0.6875rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#94a3b8',
    marginBottom: '0.5rem',
  },
  gbpPreviewCard: {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  gbpPreviewImage: {
    aspectRatio: '16 / 9',
    background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gbpPreviewImagePlaceholder: {
    fontSize: '0.8125rem',
    color: '#64748b',
    fontFamily: 'monospace',
  },
  gbpPreviewBody: {
    padding: '0.875rem 1rem',
  },
  gbpPreviewBusiness: {
    fontSize: '0.8125rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.375rem',
  },
  gbpPreviewText: {
    fontSize: '0.8125rem',
    color: '#475569',
    lineHeight: 1.5,
    marginBottom: '0.625rem',
  },
  gbpPreviewCtaWrap: {
    borderTop: '1px solid #e2e8f0',
    paddingTop: '0.625rem',
  },
  gbpPreviewCta: {
    background: 'transparent',
    color: '#1a73e8',
    border: 'none',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
  },
  fieldLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: '0.375rem',
  },
  fieldLabelText: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  charCounter: {
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
  },
  textarea: {
    width: '100%',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.75rem 0.875rem',
    resize: 'vertical',
    lineHeight: 1.5,
  },
  fieldRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  select: {
    width: '100%',
    fontSize: '0.875rem',
    color: '#1e293b',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
  },
  input: {
    width: '100%',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    color: '#1e293b',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.75rem',
  },
  toast: {
    position: 'fixed',
    bottom: '5rem',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.75rem 1.25rem',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.875rem',
    fontWeight: 500,
    boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
    zIndex: 200,
    maxWidth: '90vw',
  },
};
