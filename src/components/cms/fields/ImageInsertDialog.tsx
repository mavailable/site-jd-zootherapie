// ImageInsertDialog — modale d'insertion d'image dans l'editeur richtext.
//
// Etape 1 : choisir une image (reutilise MediaLibrary — bibliotheque existante,
//           upload + selection deja gerees, on ne reinvente pas l'upload).
// Etape 2 : saisir la legende (figcaption) et le texte alternatif (alt),
//           puis inserer la figure au curseur.
//
// La modale appelle onInsert({ src, alt, caption }) ; RichTextField execute
// la commande setFigure du noeud Figure custom.

import { useState } from 'react';
import { MediaLibrary } from '../MediaLibrary';
import { t } from '../locales';

interface ImageInsertDialogProps {
  onInsert: (data: { src: string; alt: string; caption: string }) => void;
  onClose: () => void;
}

export function ImageInsertDialog({ onInsert, onClose }: ImageInsertDialogProps) {
  const [step, setStep] = useState<'pick' | 'details'>('pick');
  const [src, setSrc] = useState('');
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');

  // Etape 1 : selection / upload via la bibliotheque existante.
  if (step === 'pick') {
    return (
      <MediaLibrary
        isModal
        onClose={onClose}
        onSelect={(url) => {
          setSrc(url);
          setStep('details');
        }}
      />
    );
  }

  // Etape 2 : legende + alt.
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>{t('imgInsertTitle')}</h2>
          <button onClick={onClose} style={styles.closeBtn} aria-label={t('close')}>×</button>
        </div>

        <div style={styles.previewWrap}>
          <img src={src} alt="" style={styles.preview} />
        </div>

        <label style={styles.label}>
          {t('imgInsertCaption')}
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('imgInsertCaptionPlaceholder')}
            style={styles.input}
            autoFocus
          />
        </label>

        <label style={styles.label}>
          {t('imgInsertAlt')}
          <input
            type="text"
            value={alt}
            onChange={(e) => setAlt(e.target.value)}
            placeholder={t('imgInsertAltPlaceholder')}
            style={styles.input}
          />
          <span style={styles.hint}>{t('imgInsertAltHint')}</span>
        </label>

        <div style={styles.actions}>
          <button type="button" onClick={() => setStep('pick')} style={styles.secondaryBtn}>
            {t('imgInsertChangeImage')}
          </button>
          <button
            type="button"
            onClick={() => onInsert({ src, alt, caption })}
            style={styles.primaryBtn}
          >
            {t('imgInsertConfirm')}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 210,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '480px',
    padding: '1.5rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  title: { fontSize: '1.125rem', fontWeight: 700, color: '#0f172a' },
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
  previewWrap: {
    borderRadius: '8px',
    overflow: 'hidden',
    marginBottom: '1rem',
    background: '#f1f5f9',
    maxHeight: '220px',
    display: 'flex',
    justifyContent: 'center',
  },
  preview: { maxWidth: '100%', maxHeight: '220px', objectFit: 'contain' },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '0.875rem',
  },
  input: {
    display: 'block',
    width: '100%',
    marginTop: '0.375rem',
    padding: '0.5rem 0.625rem',
    fontSize: '0.9375rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    boxSizing: 'border-box',
  },
  hint: { display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  secondaryBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    background: '#fff',
    color: '#475569',
    cursor: 'pointer',
  },
  primaryBtn: {
    padding: '0.5rem 1.25rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    borderRadius: '6px',
    background: '#2563eb',
    color: '#fff',
    cursor: 'pointer',
  },
};
