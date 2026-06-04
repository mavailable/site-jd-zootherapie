import { useState, useEffect, useCallback, useRef } from 'react';
import { useToastContext } from './CmsApp';
import { optimizeImage } from './optimizeImage';
import { t } from './locales';

interface ImageItem {
  name: string;
  url: string;
  size: number;
  key: string;
  uploaded?: string;
}

interface MediaLibraryProps {
  onSelect?: (url: string) => void;
  onClose?: () => void;
  isModal?: boolean;
}

// Concurrence d'upload bornee (R2 put en parallele, mais pas tous d'un coup) et
// plafond par lot (garde-fou UX/perf : au-dela, on invite a fractionner).
const UPLOAD_CONCURRENCY = 4;
const MAX_FILES_PER_BATCH = 20;

export function MediaLibrary({ onSelect, onClose, isModal = false }: MediaLibraryProps) {
  const { addToast } = useToastContext();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  // Progression multi-upload : { done, total } pendant un lot, null sinon.
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
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
      addToast(t('unableLoadImages'), 'error');
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadImages(); }, [loadImages]);

  // Optimise (cote navigateur, fix iOS conserve) puis envoie un fichier vers R2.
  // Renvoie l'ImageItem cree ou null en cas d'echec (echec ISOLE : ne casse pas
  // les autres fichiers du lot).
  async function uploadOne(rawFile: File): Promise<ImageItem | null> {
    let file = rawFile;
    try {
      file = await optimizeImage(rawFile);
    } catch {
      file = rawFile;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t('uploadError'));
      }
      return (await res.json()) as ImageItem;
    } catch {
      return null;
    }
  }

  // Upload d'un seul fichier (insertion inline / champ image unique) avec toast.
  async function uploadFile(rawFile: File): Promise<string | null> {
    setOptimizing(true);
    setProgress({ done: 0, total: 1 });
    const item = await uploadOne(rawFile);
    setProgress(null);
    setOptimizing(false);
    if (item) {
      addToast(t('imageUploaded', { name: item.name }), 'success');
      setImages((prev) => [item, ...prev]);
      return item.url;
    }
    addToast(t('uploadError'), 'error');
    return null;
  }

  // Upload d'un lot de fichiers en PARALLELE BORNE, avec barre de progression
  // N/total et echec isole par fichier. Renvoie l'URL du DERNIER fichier reussi
  // (pour l'auto-selection apres un upload simple via le picker).
  async function uploadBatch(rawFiles: File[]): Promise<string | null> {
    const files = rawFiles.filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) return null;

    if (files.length > MAX_FILES_PER_BATCH) {
      addToast(t('tooManyFiles', { max: String(MAX_FILES_PER_BATCH) }), 'error');
      return null;
    }

    if (files.length === 1) return uploadFile(files[0]);

    const total = files.length;
    let done = 0;
    let failed = 0;
    let lastUrl: string | null = null;
    const fresh: ImageItem[] = [];

    setProgress({ done: 0, total });

    let cursor = 0;
    async function worker() {
      while (cursor < files.length) {
        const idx = cursor++;
        const item = await uploadOne(files[idx]);
        if (item) {
          fresh.push(item);
          lastUrl = item.url;
        } else {
          failed++;
        }
        done++;
        setProgress({ done, total });
      }
    }

    const workers = Array.from(
      { length: Math.min(UPLOAD_CONCURRENCY, files.length) },
      () => worker()
    );
    await Promise.all(workers);

    setProgress(null);

    // Ajout en tete dans l'ordre d'upload (les derniers termines en premier
    // serait deroutant — on garde l'ordre des fichiers).
    if (fresh.length > 0) {
      setImages((prev) => [...fresh, ...prev]);
      addToast(t('imagesUploaded', { count: String(fresh.length) }), 'success');
    }
    if (failed > 0) {
      addToast(t('someUploadsFailed', { failed: String(failed), total: String(total) }), 'error');
    }
    return lastUrl;
  }

  async function handleDelete(image: ImageItem) {
    if (!window.confirm(t('confirmDeleteImage', { name: image.name }))) return;
    try {
      const res = await fetch(
        `/api/cms/image-delete?key=${encodeURIComponent(image.key)}`,
        { method: 'DELETE' }
      );
      if (res.ok) {
        setImages((prev) => prev.filter((i) => i.key !== image.key));
        addToast(t('imageDeleted'), 'success');
      } else {
        addToast(t('deleteError'), 'error');
      }
    } catch {
      addToast(t('deleteError'), 'error');
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    uploadBatch(files).then((url) => {
      if (url && onSelect && files.filter((f) => f.type.startsWith('image/')).length === 1) {
        onSelect(url);
      }
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    // Reset l'input pour pouvoir re-selectionner les memes fichiers ensuite.
    if (fileInputRef.current) fileInputRef.current.value = '';
    uploadBatch(files).then((url) => {
      if (url && onSelect && files.filter((f) => f.type.startsWith('image/')).length === 1) {
        onSelect(url);
      }
    });
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  }

  const busy = optimizing || progress !== null;

  const content = (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{t('imagesTitle')}</h2>
        {onClose && (
          <button onClick={onClose} style={styles.closeBtn} aria-label={t('close')}>×</button>
        )}
      </div>

      {/* Upload zone */}
      <div
        style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => { if (!busy) fileInputRef.current?.click(); }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        {progress ? (
          <div style={styles.progressWrap}>
            <span style={styles.dropText}>
              {t('uploadingProgress', { done: String(progress.done), total: String(progress.total) })}
            </span>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${Math.round((progress.done / progress.total) * 100)}%`,
                }}
              />
            </div>
          </div>
        ) : optimizing ? (
          <span style={styles.dropText}>{t('optimizing')}</span>
        ) : (
          <span style={styles.dropText}>
            {t('dropImagesHere')} <span style={styles.dropLink}>{t('browse')}</span>
          </span>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={styles.loadingText}>{t('loading')}</div>
      ) : images.length === 0 ? (
        <div style={styles.emptyText}>{t('noImages')}</div>
      ) : (
        <div style={styles.grid}>
          {images.map((img) => (
            <div key={img.key} style={styles.imageCard}>
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
              <button onClick={() => handleDelete(img)} style={styles.imageDeleteBtn} title={t('deleteTooltip')}>
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
  progressWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  },
  progressTrack: {
    width: '100%',
    maxWidth: '260px',
    height: '6px',
    borderRadius: '999px',
    background: '#e2e8f0',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    background: '#2563eb',
    borderRadius: '999px',
    transition: 'width 0.2s ease',
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
