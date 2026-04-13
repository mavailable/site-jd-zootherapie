import { useState, useEffect, useCallback, useRef } from 'react';
import { useContent } from './hooks/useContent';
import { useDirty } from './hooks/useDirty';
import { useToastContext, navigate } from './CmsApp';

interface Section {
  id: string;
  label: string;
  visible: boolean;
}

const LAYOUT_PATH = 'src/content/layout/index.json';

export function SectionManager() {
  const { fetchFile, saveFile } = useContent();
  const { addToast } = useToastContext();

  const [sections, setSections] = useState<Section[]>([]);
  const [sha, setSha] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await saveFile(
        LAYOUT_PATH,
        { sections },
        sha,
        '[CMS] Mise à jour ordre des sections'
      );
      setSha(result.sha);
      setClean();
      addToast('Enregistre ! Votre site se met a jour.', 'success');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur de sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  }, [sections, sha, saving]); // eslint-disable-line react-hooks/exhaustive-deps

  const { dirty, markDirty, setClean } = useDirty(handleSave);

  useEffect(() => {
    fetchFile(LAYOUT_PATH)
      .then(({ content, sha }) => {
        setSections((content as { sections: Section[] }).sections || []);
        setSha(sha);
      })
      .catch(() => addToast('Impossible de charger les sections', 'error'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleVisibility(index: number) {
    setSections((prev) => prev.map((s, i) => i === index ? { ...s, visible: !s.visible } : s));
    markDirty();
  }

  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setSections((prev) => {
      const items = [...prev];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(index, 0, moved);
      return items;
    });
    markDirty();
    setDragIndex(null);
    setDragOverIndex(null);
  }

  if (loading) {
    return <div style={styles.loading}>Chargement...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <button onClick={() => navigate('#/')} style={styles.backBtn}>← Retour</button>
        <h1 style={styles.title}>Sections de la page</h1>
        <p style={styles.subtitle}>Glissez pour réorganiser, cliquez pour masquer/afficher</p>
      </div>

      <div style={styles.list}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={() => handleDrop(index)}
            onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
            style={{
              ...styles.item,
              ...(dragIndex === index ? styles.itemDragging : {}),
              ...(dragOverIndex === index && dragIndex !== index ? styles.itemDragOver : {}),
              ...(!section.visible ? styles.itemHidden : {}),
            }}
          >
            <span style={styles.dragHandle} title="Glisser pour déplacer">⠿</span>
            <span style={{ ...styles.itemLabel, ...(!section.visible ? styles.labelHidden : {}) }}>
              {section.label}
            </span>
            <button
              onClick={() => toggleVisibility(index)}
              style={section.visible ? styles.toggleOn : styles.toggleOff}
              title={section.visible ? 'Masquer' : 'Afficher'}
            >
              {section.visible ? 'Visible' : 'Masqué'}
            </button>
          </div>
        ))}
      </div>

      {/* Save bar */}
      <div style={styles.saveBar}>
        {dirty && <span style={styles.dirtyDot} />}
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          style={{ ...styles.saveBtn, ...(!dirty ? styles.saveBtnDisabled : {}) }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
        <span style={styles.deployNote}>
          {dirty ? 'Modifications non enregistrées' : 'Le site sera mis à jour dans ~2 min'}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { textAlign: 'center', padding: '3rem', color: '#94a3b8' },
  header: { marginBottom: '1.5rem' },
  backBtn: {
    fontSize: '0.875rem', color: '#64748b', background: 'none',
    border: 'none', cursor: 'pointer', padding: 0, marginBottom: '0.5rem',
  },
  title: { fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' },
  subtitle: { fontSize: '0.8125rem', color: '#94a3b8', marginTop: '0.25rem' },
  list: {
    background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0',
    overflow: 'hidden', marginBottom: '5rem',
  },
  item: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9',
    cursor: 'grab', transition: 'background 0.1s',
    userSelect: 'none' as const,
  },
  itemDragging: { opacity: 0.4, background: '#f1f5f9' },
  itemDragOver: { borderTop: '2px solid #3b82f6', paddingTop: 'calc(0.875rem - 2px)' },
  itemHidden: { background: '#f8fafc' },
  dragHandle: {
    fontSize: '1.25rem', color: '#cbd5e1', cursor: 'grab',
    width: '20px', textAlign: 'center' as const, flexShrink: 0,
  },
  itemLabel: { flex: 1, fontSize: '0.9375rem', fontWeight: 500, color: '#1e293b' },
  labelHidden: { color: '#94a3b8', textDecoration: 'line-through' },
  toggleOn: {
    padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 600,
    color: '#059669', background: '#ecfdf5', border: '1px solid #a7f3d0',
    borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  toggleOff: {
    padding: '0.25rem 0.625rem', fontSize: '0.75rem', fontWeight: 600,
    color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0',
    borderRadius: '999px', cursor: 'pointer', whiteSpace: 'nowrap' as const,
  },
  saveBar: {
    position: 'fixed' as const, bottom: 0, left: 0, right: 0,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.75rem 1.5rem', background: '#fff',
    borderTop: '1px solid #e2e8f0', boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
    zIndex: 50, flexWrap: 'wrap' as const,
  },
  dirtyDot: { width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', flexShrink: 0 },
  saveBtn: {
    padding: '0.625rem 1.5rem', fontSize: '0.9375rem', fontWeight: 600,
    color: '#fff', background: '#059669', border: 'none', borderRadius: '8px', cursor: 'pointer',
  },
  saveBtnDisabled: { background: '#94a3b8', cursor: 'default' },
  deployNote: { fontSize: '0.8125rem', color: '#94a3b8', flex: 1 },
};
