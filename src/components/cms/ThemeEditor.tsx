import { useState, useEffect, useCallback } from 'react';
import { useContent } from './hooks/useContent';
import { useDirty } from './hooks/useDirty';
import { useToastContext, navigate } from './CmsApp';
import { SkeletonForm } from './ui/Skeleton';

const THEME_PATH = 'src/content/theme/index.json';

interface ThemeData {
  colors: {
    primary: string;
    'primary-light': string;
    accent: string;
    neutral: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: string;
  headerStyle: 'light' | 'dark';
}

const DEFAULT_THEME: ThemeData = {
  colors: { primary: '#2563eb', 'primary-light': '#eff6ff', accent: '#f59e0b', neutral: '#1e293b' },
  fonts: { heading: 'DM Sans', body: 'Inter' },
  radius: '8px',
  headerStyle: 'light',
};

const FONT_OPTIONS = [
  'DM Sans', 'Inter', 'Oswald', 'Source Sans 3', 'EB Garamond',
  'Instrument Serif', 'Montserrat', 'Raleway', 'Poppins', 'Lato',
];

export function ThemeEditor() {
  const { fetchFile, saveFile } = useContent();
  const { addToast } = useToastContext();

  const [data, setData] = useState<ThemeData>(DEFAULT_THEME);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveFile(THEME_PATH, data as unknown as Record<string, unknown>, sha, '[CMS] Mise à jour thème');
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
    fetchFile(THEME_PATH)
      .then(({ content, sha }) => {
        setData(content as unknown as ThemeData);
        setSha(sha);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function updateColor(key: string, value: string) {
    setData((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }));
    markDirty();
  }

  function updateFont(key: string, value: string) {
    setData((prev) => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }));
    markDirty();
  }

  if (loading) return <div style={styles.form}><SkeletonForm /></div>;

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => navigate('#/')} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.title}>Apparence du site</h1>
      </div>

      {/* Couleurs */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Couleurs</h2>
        {[
          { key: 'primary', label: 'Couleur principale' },
          { key: 'primary-light', label: 'Couleur principale claire' },
          { key: 'accent', label: 'Couleur d\'accent' },
          { key: 'neutral', label: 'Couleur neutre (texte)' },
        ].map(({ key, label }) => (
          <div key={key} style={styles.colorRow}>
            <input
              type="color"
              value={(data.colors as Record<string, string>)[key] || '#000000'}
              onChange={(e) => updateColor(key, e.target.value)}
              style={styles.colorPicker}
            />
            <div style={styles.colorInfo}>
              <span style={styles.colorLabel}>{label}</span>
              <input
                type="text"
                value={(data.colors as Record<string, string>)[key] || ''}
                onChange={(e) => updateColor(key, e.target.value)}
                style={styles.colorHex}
                placeholder="#000000"
              />
            </div>
            <div style={{
              ...styles.colorSwatch,
              background: (data.colors as Record<string, string>)[key] || '#000',
            }} />
          </div>
        ))}
      </div>

      {/* Typographie */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Typographie</h2>
        <div style={styles.field}>
          <label style={styles.label}>Police des titres</label>
          <select
            style={styles.select}
            value={data.fonts.heading}
            onChange={(e) => updateFont('heading', e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
          <div style={{ ...styles.fontPreview, fontFamily: data.fonts.heading }}>
            Aperçu du titre en {data.fonts.heading}
          </div>
        </div>
        <div style={styles.field}>
          <label style={styles.label}>Police du texte</label>
          <select
            style={styles.select}
            value={data.fonts.body}
            onChange={(e) => updateFont('body', e.target.value)}
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
            ))}
          </select>
          <div style={{ ...styles.fontPreviewBody, fontFamily: data.fonts.body }}>
            Aperçu du texte courant en {data.fonts.body}. Lorem ipsum dolor sit amet.
          </div>
        </div>
      </div>

      {/* Arrondis */}
      <div style={styles.form}>
        <h2 style={styles.sectionTitle}>Arrondis</h2>
        <div style={styles.field}>
          <label style={styles.label}>Rayon des bordures : {data.radius}</label>
          <input
            type="range"
            min="0"
            max="24"
            value={parseInt(data.radius) || 8}
            onChange={(e) => { setData((prev) => ({ ...prev, radius: `${e.target.value}px` })); markDirty(); }}
            style={styles.slider}
          />
          <div style={styles.radiusPreview}>
            <div style={{ ...styles.radiusSample, borderRadius: data.radius }}>Bouton</div>
            <div style={{ ...styles.radiusSampleCard, borderRadius: data.radius }}>Card</div>
          </div>
        </div>
      </div>

      {/* Header style */}
      <div style={{ ...styles.form, marginBottom: '5rem' }}>
        <h2 style={styles.sectionTitle}>En-tête</h2>
        <div style={styles.toggleRow}>
          <button
            style={data.headerStyle === 'light' ? styles.toggleActive : styles.toggle}
            onClick={() => { setData((prev) => ({ ...prev, headerStyle: 'light' })); markDirty(); }}
          >
            Clair
          </button>
          <button
            style={data.headerStyle === 'dark' ? styles.toggleActive : styles.toggle}
            onClick={() => { setData((prev) => ({ ...prev, headerStyle: 'dark' })); markDirty(); }}
          >
            Sombre
          </button>
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
  field: { marginBottom: '1.25rem' },
  label: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' },
  select: { display: 'block', width: '100%', padding: '0.625rem 0.75rem', fontSize: '0.9375rem', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', background: '#fff', color: '#1e293b', cursor: 'pointer' },
  // Colors
  colorRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.625rem', background: '#f8fafc', borderRadius: '8px' },
  colorPicker: { width: '44px', height: '44px', border: 'none', borderRadius: '8px', cursor: 'pointer', padding: 0 },
  colorInfo: { flex: 1 },
  colorLabel: { display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.125rem' },
  colorHex: { width: '90px', padding: '0.25rem 0.5rem', fontSize: '0.8125rem', border: '1px solid #d1d5db', borderRadius: '4px', color: '#475569', fontFamily: 'monospace' },
  colorSwatch: { width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 },
  // Fonts
  fontPreview: { marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px' },
  fontPreviewBody: { marginTop: '0.5rem', fontSize: '0.9375rem', color: '#475569', padding: '0.5rem', background: '#f8fafc', borderRadius: '6px', lineHeight: 1.6 },
  // Radius
  slider: { display: 'block', width: '100%', marginBottom: '0.75rem' },
  radiusPreview: { display: 'flex', gap: '1rem', alignItems: 'center' },
  radiusSample: { padding: '0.5rem 1.25rem', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.875rem' },
  radiusSampleCard: { width: '80px', height: '60px', background: '#f1f5f9', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#94a3b8' },
  // Toggle
  toggleRow: { display: 'flex', gap: '0.375rem' },
  toggle: { padding: '0.5rem 1rem', fontSize: '0.875rem', color: '#64748b', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' },
  toggleActive: { padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer' },
  // Save bar
  saveBar: { position: 'fixed' as const, bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)', zIndex: 50, flexWrap: 'wrap' as const },
  dirtyDot: { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 },
  saveBtn: { padding: '0.625rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600, color: '#fff', background: '#059669', border: 'none', borderRadius: '8px', cursor: 'pointer' },
  saveBtnDisabled: { background: '#94a3b8', cursor: 'default' },
  deployNote: { fontSize: '0.8125rem', color: '#94a3b8', flex: 1 },
  shortcut: { fontSize: '0.75rem', color: '#cbd5e1', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' },
};
