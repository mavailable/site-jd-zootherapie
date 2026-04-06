import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastContext } from './CmsApp';

interface ImageItem {
  name: string;
  url: string;
  path: string;
  sha: string;
  size: number;
}

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export function MediaLibrary({ onSelect, onClose, isModal = false }: MediaLibraryProps) {
  const { addToast } = useToastContext();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cms/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch {
      addToast('Impossible de charger les images', 'error');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadImages(); }, [loadImages]);

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/cms/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur upload');
      }

      const data = await res.json();
      addToast(`Image « ${data.name} » uploadée`, 'success');
      setImages((prev) => [data, ...prev]);
      return data.url;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur upload';
      addToast(msg, 'error');
      return null;
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(image: ImageItem) {
    if (!window.confirm(`Supprimer l'image « ${image.name} » ?`)) return;
    try {
      const res = await fetch(
        `/api/cms/delete?path=${encodeURIComponent(image.path)}&sha=${encodeURIComponent(image.sha)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.name !== image.name));
        addToast('Image supprimée', 'success');
      }
    } catch {
      addToast('Erreur lors de la suppression', 'error');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file).then((url) => {
        if (url && onSelect) onSelect(url);
      });
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file).then((url) => {
        if (url && onSelect) onSelect(url);
      });
    }
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  const content = (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Images</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn} aria-label="Fermer">×</button>
        )}
      </div>

      {/* Upload zone */}
      <div
        style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {uploading ? (
          <span style={styles.dropText}>Upload en cours...</span>
        ) : (
          <span style={styles.dropText}>
            Glissez une image ici ou <span style={styles.dropLink}>parcourir</span>
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={styles.loadingText}>Chargement...</div>
      ) : images.length === 0 ? (
        <div style={styles.emptyText}>Aucune image</div>
      ) : (
        <div style={styles.grid}>
          {images.map((img) => (
            <div key={img.name} style={styles.imageCard}>
              <div
                style={styles.imageWrapper}
                onClick={() => onSelect?.(img.url)}
              >
                <img src={img.url} alt={img.name} style={styles.image} loading="lazy" />
              </div>
              <div style={styles.imageMeta}>
                <span style={styles.imageName}>{img.name}</span>
                <span style={styles.imageSize}>{formatSize(img.size)}</span>
              </div>
              <button onClick={() => handleDelete(img)} style={styles.imageDeleteBtn} title="Supprimer">
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
          {content}
        </div>
      </div>
    );
  }

  return content;
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '80vh',
    overflow: 'auto',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  container: {
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.25rem',
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
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: '10px',
    padding: '1.5rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    marginBottom: '1rem',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
  },
  dropText: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  dropLink: {
    color: '#2563eb',
    fontWeight: 500,
    textDecoration: 'underline',
  },
  loadingText: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  emptyText: {
    textAlign: 'center',
    padding: '2rem',
    color: '#94a3b8',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '0.75rem',
  },
  imageCard: {
    position: 'relative',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
    background: '#f8fafc',
  },
  imageWrapper: {
    aspectRatio: '1',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  imageMeta: {
    padding: '0.375rem 0.5rem',
    display: 'flex',
    flexDirection: 'column',
  },
  imageName: {
    fontSize: '0.6875rem',
    color: '#475569',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  imageSize: {
    fontSize: '0.625rem',
    color: '#94a3b8',
  },
  imageDeleteBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 700,
    cursor: 'pointer',
    opacity: 0.8,
  },
};
