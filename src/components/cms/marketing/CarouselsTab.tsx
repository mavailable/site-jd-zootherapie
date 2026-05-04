import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

interface Carousel {
  id: string;
  subject: string;
  documentTitle: string;
  themes_available: string[];
  default_theme: string;
  thumbnail: string;
  pdfs: Record<string, string>;
  previews: Record<string, string>;
  post_text: string;
  status: 'draft' | 'scheduled' | 'published';
  scheduled_date: string | null;
  published_date: string | null;
  created_at: string;
  client_comment: string | null;
}

interface ManifestData {
  carrousels: Carousel[];
}

const STATUS_LABELS: Record<Carousel['status'], string> = {
  draft: 'Brouillon',
  scheduled: 'Planifié',
  published: 'Publié',
};

const STATUS_COLORS: Record<Carousel['status'], string> = {
  draft: '#71665B',       // neutral-700
  scheduled: '#3F8589',   // primary-500 (teal)
  published: '#B23E22',   // accent-700 (terracotta foncé)
};

export function CarouselsTab() {
  const [data, setData] = useState<ManifestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/marketing-data/carrousels.json', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Aucun carrousel pour le moment');
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={loadingStyle}>Chargement…</div>;
  if (error || !data || data.carrousels.length === 0) {
    return (
      <div style={emptyStyle}>
        <h2 style={{ margin: 0 }}>📭 Aucun carrousel pour le moment</h2>
        <p style={{ color: '#71665B' }}>
          Quand Marc générera un carrousel pour toi (via le skill <code>mkt-carousel-generate</code>),
          il apparaîtra ici avec les fichiers prêts à publier sur LinkedIn.
        </p>
      </div>
    );
  }

  const counts = {
    total: data.carrousels.length,
    draft: data.carrousels.filter((c) => c.status === 'draft').length,
    scheduled: data.carrousels.filter((c) => c.status === 'scheduled').length,
    published: data.carrousels.filter((c) => c.status === 'published').length,
  };

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontFamily: 'Lora, serif', color: '#284043' }}>
            🎞️ Carrousels LinkedIn
          </h1>
          <p style={{ margin: '4px 0 0', color: '#71665B', fontSize: 14 }}>
            {counts.total} carrousel{counts.total > 1 ? 's' : ''} disponible{counts.total > 1 ? 's' : ''} · {counts.published} publié{counts.published > 1 ? 's' : ''} · {counts.draft} brouillon{counts.draft > 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <div style={gridStyle}>
        {data.carrousels.map((c) => (
          <article key={c.id} style={cardStyle}>
            <button
              type="button"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
              style={cardHeaderBtnStyle}
            >
              <img src={c.thumbnail} alt={c.subject} style={thumbStyle} />
              <div style={{ flex: 1, textAlign: 'left' }}>
                <h3 style={cardTitleStyle}>{c.subject}</h3>
                <p style={cardSubtitleStyle}>{c.documentTitle}</p>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                  <span style={{ ...badgeStyle, background: STATUS_COLORS[c.status] }}>
                    {STATUS_LABELS[c.status]}
                  </span>
                  <span style={metaStyle}>
                    {c.themes_available.length} thème{c.themes_available.length > 1 ? 's' : ''}
                  </span>
                  {c.published_date && <span style={metaStyle}>Publié le {c.published_date}</span>}
                  {!c.published_date && c.scheduled_date && <span style={metaStyle}>Prévu le {c.scheduled_date}</span>}
                </div>
              </div>
              <span style={{ fontSize: 24, color: '#71665B' }}>{expanded === c.id ? '⌃' : '⌄'}</span>
            </button>

            {expanded === c.id && (
              <div style={cardBodyStyle}>
                <section style={sectionStyle}>
                  <h4 style={sectionTitleStyle}>📌 Titre du document LinkedIn</h4>
                  <CopyBlock value={c.documentTitle} />
                </section>

                <section style={sectionStyle}>
                  <h4 style={sectionTitleStyle}>📝 Copy du post LinkedIn</h4>
                  <CopyBlock value={c.post_text} multiline />
                </section>

                <section style={sectionStyle}>
                  <h4 style={sectionTitleStyle}>📦 Télécharger le PDF par thème</h4>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.entries(c.pdfs).map(([theme, url]) => (
                      <a
                        key={theme}
                        href={url}
                        download
                        style={{
                          ...pdfBtnStyle,
                          ...(theme === c.default_theme ? pdfBtnPrimaryStyle : {}),
                        }}
                      >
                        ⬇ {theme.toUpperCase()}.pdf
                      </a>
                    ))}
                  </div>
                </section>

                {Object.keys(c.previews).length > 0 && (
                  <section style={sectionStyle}>
                    <h4 style={sectionTitleStyle}>👁 Previews LinkedIn</h4>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {Object.entries(c.previews).map(([theme, url]) => (
                        <a key={theme} href={url} target="_blank" rel="noopener" style={previewLinkStyle}>
                          {theme.toUpperCase()}
                        </a>
                      ))}
                    </div>
                  </section>
                )}

                <section style={{ ...sectionStyle, marginTop: 16, padding: 16, background: '#FBF7ED', borderRadius: 8 }}>
                  <h4 style={{ ...sectionTitleStyle, margin: 0, marginBottom: 8 }}>🚀 Comment publier</h4>
                  <ol style={{ margin: 0, paddingLeft: 20, color: '#284043', fontSize: 14, lineHeight: 1.7 }}>
                    <li>LinkedIn desktop → <strong>"Commencer un post"</strong></li>
                    <li>Médias → <strong>"+ Ajouter un document"</strong> → upload le PDF du thème choisi</li>
                    <li>Coller le <strong>titre du document</strong> ci-dessus quand LinkedIn le demande</li>
                    <li>Coller le <strong>copy</strong> ci-dessus dans le champ texte du post</li>
                    <li>Publier 🎉</li>
                  </ol>
                </section>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function CopyBlock({ value, multiline = false }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };
  return (
    <div style={{ position: 'relative' }}>
      <pre style={multiline ? preMultilineStyle : preInlineStyle}>{value}</pre>
      <button type="button" onClick={handleCopy} style={copyBtnStyle}>
        {copied ? '✓ Copié' : 'Copier'}
      </button>
    </div>
  );
}

// ───── Styles ─────

const containerStyle: CSSProperties = { padding: '24px 16px', maxWidth: 960, margin: '0 auto' };
const loadingStyle: CSSProperties = { padding: 40, textAlign: 'center', color: '#71665B' };
const emptyStyle: CSSProperties = { padding: 40, textAlign: 'center', maxWidth: 520, margin: '0 auto' };
const headerStyle: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid #E0DCD5' };
const gridStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 16 };
const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #E0DCD5', borderRadius: 8, overflow: 'hidden' };
const cardHeaderBtnStyle: CSSProperties = { width: '100%', padding: 16, display: 'flex', alignItems: 'center', gap: 16, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' };
const thumbStyle: CSSProperties = { width: 80, height: 100, objectFit: 'cover', borderRadius: 4, background: '#F0F7F7', flexShrink: 0 };
const cardTitleStyle: CSSProperties = { margin: 0, fontSize: 18, fontFamily: 'Lora, serif', color: '#284043' };
const cardSubtitleStyle: CSSProperties = { margin: '4px 0 0', fontSize: 13, color: '#71665B' };
const badgeStyle: CSSProperties = { color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' };
const metaStyle: CSSProperties = { fontSize: 12, color: '#71665B' };
const cardBodyStyle: CSSProperties = { padding: '0 16px 20px', borderTop: '1px solid #F1EFEB' };
const sectionStyle: CSSProperties = { marginTop: 16 };
const sectionTitleStyle: CSSProperties = { margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#284043', textTransform: 'uppercase', letterSpacing: 0.6 };
const preInlineStyle: CSSProperties = { background: '#F1EFEB', padding: 10, borderRadius: 4, margin: 0, fontFamily: 'monospace', fontSize: 13, color: '#284043', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
const preMultilineStyle: CSSProperties = { ...preInlineStyle, maxHeight: 240, overflowY: 'auto' };
const copyBtnStyle: CSSProperties = { position: 'absolute', top: 6, right: 6, background: '#284043', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 };
const pdfBtnStyle: CSSProperties = { display: 'inline-block', padding: '8px 14px', background: '#F1EFEB', color: '#284043', textDecoration: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600 };
const pdfBtnPrimaryStyle: CSSProperties = { background: '#B23E22', color: '#fff' };
const previewLinkStyle: CSSProperties = { padding: '6px 12px', background: '#F0F7F7', color: '#284043', textDecoration: 'none', borderRadius: 4, fontSize: 12, fontWeight: 600 };
