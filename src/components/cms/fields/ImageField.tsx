import { useState, useRef } from 'react';
import type { CmsFieldImage } from '../../../../cms.types';
import { MediaLibrary } from '../MediaLibrary';

interface ImageFieldProps {
  field: CmsFieldImage;
  value: string;
  onChange: (value: string) => void;
}

export function ImageField({ field, value, onChange }: ImageFieldProps) {
  const [showLibrary, setShowLibrary] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/cms/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        onChange(data.url);
      }
    } catch {
      // Error handled silently
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith('image/')) handleUpload(file);
  }

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>{field.label}{field.required && <span style={{ color: '#dc2626', marginLeft: '2px' }}>*</span>}</label>
      {field.description && <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 4px' }}>{field.description}</p>}

      {value ? (
        <div style={styles.previewContainer}>
          <img src={value} alt="Aperçu" style={styles.preview} />
          <div style={styles.previewActions}>
            <span style={styles.previewPath}>{value}</span>
            <div style={styles.previewBtns}>
              <button
                type="button"
                onClick={() => setShowLibrary(true)}
                style={styles.changeBtn}
              >
                Changer
              </button>
              <button
                type="button"
                onClick={() => onChange('')}
                style={styles.removeBtn}
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{ ...styles.dropZone, ...(dragOver ? styles.dropZoneActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
            style={{ display: 'none' }}
          />
          {uploading ? (
            <span style={styles.dropText}>Upload en cours...</span>
          ) : (
            <>
              <span style={styles.dropText}>
                Glissez une image ici,{' '}
                <button type="button" onClick={() => fileInputRef.current?.click()} style={styles.linkBtn}>
                  parcourez
                </button>{' '}
                ou{' '}
                <button type="button" onClick={() => setShowLibrary(true)} style={styles.linkBtn}>
                  choisissez dans la bibliothèque
                </button>
              </span>
            </>
          )}
        </div>
      )}

      {showLibrary && (
        <MediaLibrary
          isModal
          onClose={() => setShowLibrary(false)}
          onSelect={(url) => {
            onChange(url);
            setShowLibrary(false);
          }}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { marginBottom: '1rem' },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.375rem',
  },
  previewContainer: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#f8fafc',
  },
  preview: {
    width: '100%',
    maxHeight: '200px',
    objectFit: 'cover',
    display: 'block',
  },
  previewActions: {
    padding: '0.625rem 0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    flexWrap: 'wrap' as const,
  },
  previewPath: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    flex: 1,
    minWidth: 0,
  },
  previewBtns: {
    display: 'flex',
    gap: '0.375rem',
    flexShrink: 0,
  },
  changeBtn: {
    padding: '0.25rem 0.625rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#2563eb',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '0.25rem 0.625rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#dc2626',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dropZone: {
    border: '2px dashed #d1d5db',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
    transition: 'border-color 0.15s, background 0.15s',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    background: '#eff6ff',
  },
  dropText: {
    fontSize: '0.875rem',
    color: '#64748b',
  },
  linkBtn: {
    color: '#2563eb',
    fontWeight: 500,
    textDecoration: 'underline',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: 0,
  },
};
