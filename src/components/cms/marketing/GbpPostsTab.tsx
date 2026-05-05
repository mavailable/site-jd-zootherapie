import { useState, useMemo, useEffect } from 'react';
import type { CSSProperties } from 'react';
import cmsConfig from '../../../../cms.config';

// ─── Config ─────────────────────────────────────────────────────

const GBP_MODE: 'demo' | 'manual' | 'live' = cmsConfig.gbp?.mode ?? 'demo';
const GBP_EDIT_URL = cmsConfig.gbp?.gbpEditUrl ?? 'https://business.google.com/posts';
const UTM_PREFIX = cmsConfig.gbp?.utmCampaignPrefix ?? 'blog';
const STORAGE_KEY = 'gbp-posts-history';

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
    image: '/images/animal-tap-tap.webp',
    url: 'https://jdzootherapeute.fr/blog/alzheimer-et-mediation-animale/',
  },
  {
    slug: 'mon-enfant-a-peur-des-chiens',
    title: 'Mon enfant a peur des chiens : que faire ?',
    category: 'Conseils parents',
    date: '2026-04-05',
    excerpt:
      "La peur des chiens chez l'enfant est plus fréquente qu'on ne le pense. La médiation animale propose une approche douce, progressive, qui ne force jamais l'enfant. On part de là où il en est, et on avance à son rythme.",
    image: '/images/animal-uxo.webp',
    url: 'https://jdzootherapeute.fr/blog/mon-enfant-a-peur-des-chiens/',
  },
  {
    slug: 'trois-ans-un-lapin-et-un-premier-mot',
    title: 'Trois ans, un lapin, et un premier mot',
    category: "Récits d'intervention",
    date: '2026-03-22',
    excerpt:
      "Le récit d'une séance avec un petit garçon de 3 ans qui ne parlait pas encore. Ce jour-là, face au lapin Tap-Tap, il a prononcé son premier mot. Ce moment-là ne s'oublie pas, ni pour la maman, ni pour moi.",
    image: '/images/animal-tap-tap.webp',
    url: 'https://jdzootherapeute.fr/blog/trois-ans-un-lapin-et-un-premier-mot/',
  },
  {
    slug: 'zootherapie-calinotherapie-differences',
    title: 'Zoothérapie ou câlinothérapie : quelles différences ?',
    category: 'Pédagogie',
    date: '2026-03-08',
    excerpt:
      "Beaucoup de gens confondent les deux. La câlinothérapie, c'est un moment de bien-être avec un animal. La zoothérapie, c'est un programme avec des objectifs thérapeutiques mesurables, sur la durée. Les deux ont leur valeur, mais ce n'est pas la même chose.",
    image: '/images/animal-tips.webp',
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
    image: '/images/animal-tap-tap.webp',
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
    image: '/images/animal-uxo.webp',
    sourceArticleSlug: 'mon-enfant-a-peur-des-chiens',
    sourceArticleTitle: 'Mon enfant a peur des chiens',
    views: 178,
    clicks: 22,
  },
];

// ─── Génération mock du post depuis un article ──────────────────

function withUtm(url: string, slug: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'google');
    u.searchParams.set('utm_medium', 'gbp');
    u.searchParams.set('utm_campaign', `${UTM_PREFIX}-${slug}`);
    return u.toString();
  } catch {
    return url;
  }
}

function generatePostFromArticle(article: BlogArticle): DraftPost {
  const hooks = [
    `📖 Nouvel article : « ${article.title} »`,
    `🐾 Article à lire : « ${article.title} »`,
    `Cette semaine sur le blog : « ${article.title} »`,
  ];
  const hook = hooks[Math.floor(Math.random() * hooks.length)];

  const closer =
    "À lire si vous vous demandez comment la médiation animale peut vous aider, ou aider quelqu'un que vous accompagnez.";

  const text = `${hook}\n\n${article.excerpt}\n\n${closer}`;

  return {
    text,
    cta: 'LEARN_MORE',
    ctaUrl: withUtm(article.url, article.slug),
    image: article.image,
    sourceArticle: article,
  };
}

function loadHistoryFromStorage(): GbpPost[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveHistoryToStorage(history: GbpPost[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {}
}

// ─── Tab principal ──────────────────────────────────────────────

export function GbpPostsTab() {
  const [draft, setDraft] = useState<DraftPost | null>(null);
  const [history, setHistory] = useState<GbpPost[]>(() => {
    // En manual: hydrate depuis localStorage. En demo: utilise les MOCK_HISTORY.
    if (GBP_MODE === 'manual') {
      return loadHistoryFromStorage() ?? [];
    }
    return MOCK_HISTORY;
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Persistance localStorage en mode manual uniquement
  useEffect(() => {
    if (GBP_MODE === 'manual') {
      saveHistoryToStorage(history);
    }
  }, [history]);

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
        msg:
          GBP_MODE === 'manual'
            ? 'Post enregistré dans l\'historique. Vérifie qu\'il est bien publié sur ta fiche GBP.'
            : 'Post publié sur Google Business Profile (mode demo, aucun appel API réel).',
      });
      setTimeout(() => setToast(null), 4500);
    }, GBP_MODE === 'manual' ? 200 : 800);
  }

  function deletePost(id: string) {
    setHistory((prev) => prev.filter((p) => p.id !== id));
    setToast({
      type: 'success',
      msg:
        GBP_MODE === 'manual'
          ? 'Post retiré de l\'historique local. Pense à le supprimer aussi sur ta fiche GBP si nécessaire.'
          : 'Post supprimé de la fiche GBP (mode demo).',
    });
    setTimeout(() => setToast(null), 3500);
  }

  async function copyDraftText() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.text);
      setToast({ type: 'success', msg: 'Texte du post copié dans le presse-papier.' });
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast({ type: 'error', msg: 'Impossible de copier — sélectionne le texte et copie manuellement.' });
      setTimeout(() => setToast(null), 3500);
    }
  }

  async function copyDraftCtaUrl() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.ctaUrl);
      setToast({ type: 'success', msg: 'URL du CTA (avec UTM) copiée.' });
      setTimeout(() => setToast(null), 2500);
    } catch {}
  }

  function openGbp() {
    window.open(GBP_EDIT_URL, '_blank', 'noopener,noreferrer');
  }

  async function downloadDraftImage() {
    if (!draft || !draft.image) {
      setToast({ type: 'error', msg: "Pas d'image à télécharger pour ce post." });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    try {
      const res = await fetch(draft.image, { credentials: 'same-origin' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const ext = (draft.image.split('.').pop() || 'webp').split('?')[0].toLowerCase();
      const filename = `gbp-${draft.sourceArticle.slug}.${ext}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast({ type: 'success', msg: `Image téléchargée : ${filename}` });
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast({
        type: 'error',
        msg: "Impossible de télécharger. Fais clic-droit sur l'aperçu en haut puis Enregistrer l'image sous.",
      });
      setTimeout(() => setToast(null), 5000);
    }
  }

  return (
    <section style={styles.container}>
      {/* Mode banner */}
      {GBP_MODE === 'demo' && (
        <div style={styles.demoBanner}>
          <span style={styles.demoBadge}>DEMO</span>
          <span>
            Cet onglet est en mode démonstration. Aucun appel à l'API Google Business Profile
            n'est effectué. Le mode live sera activé après whitelist Google.
          </span>
        </div>
      )}
      {GBP_MODE === 'manual' && (
        <div style={styles.manualBanner}>
          <span style={styles.manualBadge}>MODE MANUEL</span>
          <span>
            Génère ton post automatiquement, copie-colle le texte sur Google Business Profile,
            ajoute l'image, publie. Le passage en publication automatique se fera dès que Google
            valide notre demande d'accès API (en cours, retour mi-mai).
          </span>
        </div>
      )}
      {GBP_MODE === 'live' && (
        <div style={styles.liveBanner}>
          <span style={styles.liveBadge}>LIVE</span>
          <span>Publication automatique sur ta fiche Google Business Profile activée.</span>
        </div>
      )}

      {/* Hero */}
      <header style={styles.hero}>
        <div>
          <div style={styles.sectionLabel}>Marketing local</div>
          <h1 style={styles.title}>Posts Google Business Profile</h1>
          <p style={styles.subtitle}>
            {GBP_MODE === 'manual'
              ? "Génère un post GBP depuis un article de ton blog, copie le texte, ouvre Google Business, publie. Chaque clic est tracké automatiquement (UTM). Entretient l'activité de ta fiche pour le local pack."
              : "Génère un post GBP à partir d'un article de blog. Publie en 1 clic sur ta fiche Google Business, entretient l'activité de la fiche et nourrit le local pack."}
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
                  {article.image ? (
                    <img
                      src={article.image}
                      alt=""
                      style={styles.articleThumbImg}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span style={styles.articleThumbEmoji}>📰</span>
                  )}
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
                <div style={styles.historyBody}>
                  {post.image && (
                    <img
                      src={post.image}
                      alt=""
                      style={styles.historyThumb}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div style={styles.historyText}>
                  {post.text.split('\n').map((line, i) => (
                    <p key={i} style={styles.historyTextLine}>
                      {line || ' '}
                    </p>
                  ))}
                  </div>
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
          mode={GBP_MODE}
          gbpEditUrl={GBP_EDIT_URL}
          onChange={setDraft}
          onPublish={publishDraft}
          onCopyText={copyDraftText}
          onCopyCtaUrl={copyDraftCtaUrl}
          onDownloadImage={downloadDraftImage}
          onOpenGbp={openGbp}
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
  mode: 'demo' | 'manual' | 'live';
  gbpEditUrl: string;
  onChange: (d: DraftPost) => void;
  onPublish: () => void;
  onCopyText: () => void;
  onCopyCtaUrl: () => void;
  onDownloadImage: () => void;
  onOpenGbp: () => void;
  onClose: () => void;
  publishing: boolean;
}

function DraftModal({
  draft,
  mode,
  gbpEditUrl,
  onChange,
  onPublish,
  onCopyText,
  onCopyCtaUrl,
  onDownloadImage,
  onOpenGbp,
  onClose,
  publishing,
}: DraftModalProps) {
  const charCount = draft.text.length;
  const overLimit = charCount > 1500;
  const isManual = mode === 'manual';

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
                {draft.image ? (
                  <img
                    src={draft.image}
                    alt=""
                    style={styles.gbpPreviewImageImg}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span style={styles.gbpPreviewImagePlaceholder}>🖼 Pas d'image</span>
                )}
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

        {isManual && (
          <div style={styles.manualSteps}>
            <div style={styles.manualStepsTitle}>4 étapes pour publier sur ta fiche GBP</div>
            <ol style={styles.manualStepsList}>
              <li>
                Clique <strong>Copier le texte</strong> et <strong>Télécharger l'image</strong>{' '}
                (l'image se sauvegarde dans ton dossier Téléchargements).
              </li>
              <li>
                Clique <strong>Ouvrir Google Business →</strong>, choisis "Ajouter un post".
              </li>
              <li>
                Sur GBP : colle le texte, ajoute l'image téléchargée, choisis le bouton CTA
                (En savoir plus / Réserver…), colle l'URL du CTA, clique Publier.
              </li>
              <li>
                Reviens ici et clique <strong>Marquer comme publié</strong> pour archiver le
                post dans ton historique.
              </li>
            </ol>
          </div>
        )}

        <footer style={styles.modalFooter}>
          <button type="button" onClick={onClose} style={styles.btnSecondary} disabled={publishing}>
            Annuler
          </button>

          {isManual ? (
            <>
              <button type="button" onClick={onCopyText} style={styles.btnTertiary} disabled={publishing}>
                📋 Copier le texte
              </button>
              <button type="button" onClick={onCopyCtaUrl} style={styles.btnTertiary} disabled={publishing}>
                🔗 Copier l'URL du CTA
              </button>
              <button
                type="button"
                onClick={onDownloadImage}
                style={styles.btnTertiary}
                disabled={publishing || !draft.image}
                title={!draft.image ? "Pas d'image à télécharger" : undefined}
              >
                📥 Télécharger l'image
              </button>
              <button type="button" onClick={onOpenGbp} style={styles.btnSecondary} disabled={publishing}>
                Ouvrir Google Business ↗
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
                {publishing ? 'Enregistrement…' : '✓ Marquer comme publié'}
              </button>
            </>
          ) : (
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
          )}
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
  manualBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    color: '#1e3a8a',
    lineHeight: 1.5,
  },
  manualBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#2563eb',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },
  liveBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '0.75rem 1rem',
    fontSize: '0.8125rem',
    color: '#166534',
  },
  liveBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    background: '#16a34a',
    color: '#fff',
    fontSize: '0.6875rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    padding: '0.1875rem 0.5rem',
    borderRadius: '4px',
    flexShrink: 0,
  },
  btnTertiary: {
    background: '#f1f5f9',
    color: '#1e293b',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.5rem 0.875rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  manualSteps: {
    margin: '0 1.5rem 0',
    padding: '1rem 1.125rem',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '10px',
  },
  manualStepsTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#1e3a8a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem',
  },
  manualStepsList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.8125rem',
    color: '#1e3a8a',
    lineHeight: 1.6,
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
    overflow: 'hidden',
  },
  articleThumbImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
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
  historyBody: {
    display: 'flex',
    gap: '0.875rem',
    alignItems: 'flex-start',
  },
  historyThumb: {
    width: '120px',
    height: '120px',
    borderRadius: '8px',
    objectFit: 'cover',
    flexShrink: 0,
    background: '#f1f5f9',
    display: 'block',
  },
  historyText: {
    flex: 1,
    fontSize: '0.875rem',
    color: '#1e293b',
    lineHeight: 1.5,
    background: '#f8fafc',
    border: '1px solid #f1f5f9',
    borderRadius: '8px',
    padding: '0.75rem 0.875rem',
    minWidth: 0,
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
    overflow: 'hidden',
  },
  gbpPreviewImageImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
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
