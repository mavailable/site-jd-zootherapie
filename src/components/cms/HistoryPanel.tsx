import { useState, useEffect } from 'react';
import { useToastContext } from './CmsApp';

interface HistoryEntry {
  sha: string;
  message: string;
  date: string;
  author: string;
}

interface HistoryPanelProps {
  path: string;
  currentData: Record<string, unknown>;
  onRestore: (data: Record<string, unknown>) => void;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "à l'instant";
  if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `il y a ${Math.floor(seconds / 86400)} j`;

  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

export function HistoryPanel({ path, currentData, onRestore, onClose }: HistoryPanelProps) {
  const { addToast } = useToastContext();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSha, setSelectedSha] = useState<string | null>(null);
  const [versionData, setVersionData] = useState<Record<string, unknown> | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);

  useEffect(() => {
    fetch(`/api/cms/history?path=${encodeURIComponent(path)}`)
      .then((res) => res.json())
      .then((data) => setEntries(data.history || []))
      .catch(() => addToast("Impossible de charger l'historique", 'error'))
      .finally(() => setLoading(false));
  }, [path]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadVersion(sha: string) {
    setSelectedSha(sha);
    setLoadingVersion(true);
    setVersionData(null);
    try {
      const res = await fetch(`/api/cms/version?path=${encodeURIComponent(path)}&ref=${sha}`);
      const data = await res.json();
      if (data.content) setVersionData(data.content);
    } catch {
      addToast('Impossible de charger cette version', 'error');
    } finally {
      setLoadingVersion(false);
    }
  }

  function handleRestore() {
    if (!versionData) return;
    if (window.confirm('Restaurer cette version ? Le contenu actuel sera remplacé.')) {
      onRestore(versionData);
      addToast('Version restaurée — pensez à enregistrer', 'info');
      onClose();
    }
  }

  function formatMessage(msg: string): string {
    return msg.replace(/^\[CMS\]\s*/, '');
  }

  function renderDiff(old: Record<string, unknown>, current: Record<string, unknown>) {
    const allKeys = new Set([...Object.keys(old), ...Object.keys(current)]);
    const diffs: Array<{ key: string; changed: boolean; oldVal: string; newVal: string }> = [];

    for (const key of allKeys) {
      const oldVal = JSON.stringify(old[key] ?? '', null, 0);
      const newVal = JSON.stringify(current[key] ?? '', null, 0);
      if (oldVal !== newVal) {
        diffs.push({ key, changed: true, oldVal, newVal });
      }
    }

    if (diffs.length === 0) {
      return <p style={styles.noDiff}>Identique à la version actuelle</p>;
    }

    return (
      <div style={styles.diffList}>
        {diffs.map((d) => (
          <div key={d.key} style={styles.diffItem}>
            <span style={styles.diffKey}>{d.key}</span>
            <div style={styles.diffOld}>{truncate(d.oldVal, 100)}</div>
            <div style={styles.diffNew}>{truncate(d.newVal, 100)}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>Historique</h3>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {loading ? (
          <div style={styles.loadingText}>Chargement...</div>
        ) : entries.length === 0 ? (
          <div style={styles.emptyText}>Aucun historique disponible</div>
        ) : (
          <div style={styles.list}>
            {entries.map((entry) => (
              <div key={entry.sha}>
                <button
                  onClick={() => loadVersion(entry.sha)}
                  style={{
                    ...styles.entry,
                    ...(selectedSha === entry.sha ? styles.entryActive : {}),
                  }}
                >
                  <div style={styles.entryMessage}>{formatMessage(entry.message)}</div>
                  <div style={styles.entryDate}>{timeAgo(entry.date)}</div>
                </button>

                {selectedSha === entry.sha && (
                  <div style={styles.versionDetail}>
                    {loadingVersion ? (
                      <div style={styles.loadingText}>Chargement...</div>
                    ) : versionData ? (
                      <>
                        {renderDiff(versionData, currentData)}
                        <button onClick={handleRestore} style={styles.restoreBtn}>
                          Restaurer cette version
                        </button>
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '...';
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'flex-end',
    zIndex: 200,
  },
  panel: {
    width: '100%',
    maxWidth: '400px',
    background: '#fff',
    height: '100%',
    overflowY: 'auto',
    boxShadow: '-4px 0 16px rgba(0,0,0,0.1)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    position: 'sticky',
    top: 0,
    background: '#fff',
    zIndex: 1,
  },
  title: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  closeBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '1.25rem',
    color: '#64748b',
    cursor: 'pointer',
  },
  loadingText: {
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  emptyText: {
    padding: '2rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.875rem',
  },
  list: {
    padding: '0.5rem',
  },
  entry: {
    width: '100%',
    display: 'block',
    textAlign: 'left' as const,
    padding: '0.75rem 1rem',
    background: 'none',
    border: '1px solid transparent',
    borderRadius: '8px',
    cursor: 'pointer',
    marginBottom: '2px',
    transition: 'background 0.1s',
  },
  entryActive: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  entryMessage: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#1e293b',
    marginBottom: '0.125rem',
  },
  entryDate: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  versionDetail: {
    padding: '0.75rem 1rem',
    background: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '0.5rem',
  },
  noDiff: {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  diffList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  diffItem: {
    fontSize: '0.8125rem',
  },
  diffKey: {
    fontWeight: 600,
    color: '#475569',
    display: 'block',
    marginBottom: '0.125rem',
  },
  diffOld: {
    color: '#dc2626',
    background: '#fef2f2',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    marginBottom: '2px',
  },
  diffNew: {
    color: '#059669',
    background: '#ecfdf5',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  restoreBtn: {
    width: '100%',
    padding: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
