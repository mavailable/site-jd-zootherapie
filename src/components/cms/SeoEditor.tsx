import { useState, useEffect, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { useDirty } from './hooks/useDirty';
import { useToastContext, navigate } from './CmsApp';
import { SkeletonForm } from './ui/Skeleton';

const SEO_PATH = 'src/content/seo/index.json';

interface PageSeo {
  title: string;
  description: string;
  ogImage: string;
  noindex: boolean;
}

interface SeoData {
  global: {
    siteName: string;
    separator: string;
    defaultOgImage: string;
  };
  pages: Record<string, PageSeo>;
}

const DEFAULT_SEO: SeoData = {
  global: { siteName: '', separator: '—', defaultOgImage: '/images/og-default.jpg' },
  pages: {
    '/': { title: '', description: '', ogImage: '', noindex: false },
  },
};

export function SeoEditor() {
  const { fetchFile, saveFile } = useContent();
  const { addToast } = useToastContext();

  const [data, setData] = useState<SeoData>(DEFAULT_SEO);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activePage, setActivePage] = useState('/');

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveFile(SEO_PATH, data as unknown as Record<string, unknown>, sha, '[CMS] Mise à jour SEO');
      setSha(result.sha);
      setClean();
      addToast('Enregistre ! Votre site se met a jour.', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  }, [data, sha, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const { dirty, markDirty, setClean } = useDirty(handleSave);

  useEffect(() => {
    fetchFile(SEO_PATH)
      .then(({ content, sha }) => {
        setData(content as unknown as SeoData);
        setSha(sha);
      })
      .catch(() => {
        // File doesn't exist yet, use defaults
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const page = data.pages[activePage] || { title: '', description: '', ogImage: '', noindex: false };

  function updatePage(field: keyof PageSeo, value: string | boolean) {
    setData((prev) => ({
      ...prev,
      pages: {
        ...prev.pages,
        [activePage]: { ...prev.pages[activePage], [field]: value },
      },
    }));
    markDirty();
  }

  function updateGlobal(field: string, value: string) {
    setData((prev) => ({
      ...prev,
      global: { ...prev.global, [field]: value },
    }));
    markDirty();
  }

  const fullTitle = page.title
    ? `${page.title} ${data.global.separator} ${data.global.siteName}`
    : data.global.siteName;

  if (loading) return <div style={styles.form}><SkeletonForm /></div>;

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => navigate('#/')} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.title}>SEO & Référencement</h1>
      </div>

      {/* Global */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Paramètres globaux</h2>
        <div style={styles.field}>
          <label style={styles.label}>Nom du site</label>
          <input style={styles.input} value={data.global.siteName} onChange={(e) => updateGlobal('siteName', e.target.value)} />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Séparateur de titre</label>
          <input style={styles.input} value={data.global.separator} onChange={(e) => updateGlobal('separator', e.target.value)} placeholder="—" />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Image OG par défaut</label>
          <input style={styles.input} value={data.global.defaultOgImage} onChange={(e) => updateGlobal('defaultOgImage', e.target.value)} placeholder="/images/og-default.jpg" />
        </div>
      </div>

      {/* Page selector */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Par page</h2>
        <div style={styles.pageTabs}>
          {Object.keys(data.pages).map((path) => (
            <button
              key={path}
              onClick={() => setActivePage(path)}
              style={activePage === path ? styles.pageTabActive : styles.pageTab}
            >
              {path === '/' ? 'Accueil' : path}
            </button>
          ))}
          <button
            onClick={() => {
              const path = prompt('Chemin de la page (ex: /contact)');
              if (path && !data.pages[path]) {
                setData((prev) => ({
                  ...prev,
                  pages: { ...prev.pages, [path]: { title: '', description: '', ogImage: '', noindex: false } },
                }));
                setActivePage(path);
                markDirty();
              }
            }}
            style={styles.addPageBtn}
          >
            +
          </button>
        </div>

        {/* Fields */}
        <div style={styles.field}>
          <label style={styles.label}>
            Titre
            <span style={{ ...styles.counter, ...(page.title.length > 60 ? styles.counterRed : {}) }}>
              {page.title.length}/60
            </span>
          </label>
          <input style={styles.input} value={page.title} onChange={(e) => updatePage('title', e.target.value)} placeholder="Titre de la page" />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>
            Description
            <span style={{ ...styles.counter, ...(page.description.length > 160 ? styles.counterRed : {}) }}>
              {page.description.length}/160
            </span>
          </label>
          <textarea style={styles.textarea} value={page.description} onChange={(e) => updatePage('description', e.target.value)} placeholder="Description de la page" rows={3} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Image OG</label>
          <input style={styles.input} value={page.ogImage} onChange={(e) => updatePage('ogImage', e.target.value)} placeholder="Laisser vide pour celle par défaut" />
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={page.noindex} onChange={(e) => updatePage('noindex', e.target.checked)} />
            Ne pas indexer cette page (noindex)
          </label>
        </div>
      </div>

      {/* Google Preview */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Aperçu Google</h2>
        <div style={styles.googlePreview}>
          <div style={styles.googleTitle}>{fullTitle || 'Titre de la page'}</div>
          <div style={styles.googleUrl}>example.com{activePage}</div>
          <div style={styles.googleDesc}>{page.description || 'Description de la page...'}</div>
        </div>
      </div>

      {/* OG Preview */}
      <div style={{ ...styles.form, marginBottom: '5rem' }}>
        <h2 style={styles.sectionTitle}>Aperçu réseaux sociaux</h2>
        <div style={styles.ogPreview}>
          <div style={styles.ogImage}>
            {(page.ogImage || data.global.defaultOgImage) ? (
              <img src={page.ogImage || data.global.defaultOgImage} alt="OG" style={styles.ogImg} />
            ) : (
              <div style={styles.ogPlaceholder}>Pas d'image</div>
            )}
          </div>
          <div style={styles.ogContent}>
            <div style={styles.ogDomain}>example.com</div>
            <div style={styles.ogTitle}>{page.title || 'Titre de la page'}</div>
            <div style={styles.ogDesc}>{page.description || 'Description...'}</div>
          </div>
        </div>
      </div>

      {/* Save bar */}
      <div style={styles.saveBar}>
        {dirty && <span style={styles.dirtyDot} />}
        <button onClick={handleSave} disabled={saving || !dirty}
          style={{ ...styles.saveBtn, ...(!dirty ? styles.saveBtnDisabled : {}) }}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <span style={styles.deployNote}>
          {dirty ? 'Modifications non enregistrées' : 'Le site sera mis à jour dans ~2 min'}
        </span>
        <span style={styles.shortcut}>⌘S</span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { marginBottom: '1.5rem' },
  backBtn: { fontSize: '0.875rem', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.5rem' },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' },
  form: { background: '#fff', borderRadius: '12px', padding: '1.5rem', border: '1px solid #e2e8f0', marginBottom: '1rem' },
  sectionTitle: { fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '1rem' },
  field: { marginBottom: '1rem' },
  label: { display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' },
  counter: { fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 },
  counterRed: { color: '#dc2626' },
  input: { display: 'block', width: '100%', padding: '0.625rem 0.75rem', fontSize: '0.9375rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff', color: '#1e293b', fontFamily: 'inherit' },
  textarea: { display: 'block', width: '100%', padding: '0.625rem 0.75rem', fontSize: '0.9375rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff', color: '#1e293b', fontFamily: 'inherit', resize: 'vertical' as const },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151', cursor: 'pointer' },
  pageTabs: { display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap' as const },
  pageTab: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' },
  pageTabActive: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem', color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  addPageBtn: { padding: '0.375rem 0.625rem', fontSize: '0.875rem', color: '#94a3b8', background: 'none', border: '1px dashed #d1d5db', borderRadius: '6px', cursor: 'pointer' },
  // Google preview
  googlePreview: { padding: '1rem', background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' },
  googleTitle: { fontSize: '1.125rem', color: '#1a0dab', marginBottom: '0.125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  googleUrl: { fontSize: '0.8125rem', color: '#006621', marginBottom: '0.25rem' },
  googleDesc: { fontSize: '0.8125rem', color: '#545454', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' },
  // OG preview
  ogPreview: { borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' },
  ogImage: { height: '160px', background: '#f1f5f9' },
  ogImg: { width: '100%', height: '100%', objectFit: 'cover' as const },
  ogPlaceholder: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' },
  ogContent: { padding: '0.75rem 1rem' },
  ogDomain: { fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' as const, marginBottom: '0.25rem' },
  ogTitle: { fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', marginBottom: '0.25rem' },
  ogDesc: { fontSize: '0.8125rem', color: '#64748b' },
  // Save bar
  saveBar: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', zIndex: 50, flexWrap: 'wrap' as const },
  dirtyDot: { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 },
  saveBtn: { padding: '0.625rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, color: '#fff', background: '#059669', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  saveBtnDisabled: { background: '#94a3b8', cursor: 'default' },
  deployNote: { fontSize: '0.8125rem', color: '#94a3b8', flex: 1 },
  shortcut: { fontSize: '0.75rem', color: '#cbd5e1', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
};
