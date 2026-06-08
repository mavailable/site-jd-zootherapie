import { useState, useEffect, useRef } from 'react';
import type { Contact, ContactPatch, CrmColumn } from './crmTypes';

// Palette admin jd-zoo (chrome neutre slate + accent bleu).
const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626', DANGER_SOFT = '#fecaca';
const SANS = '-apple-system, system-ui, sans-serif';

interface CrmModalProps {
  contact: Contact;
  columns: CrmColumn[];
  busy: boolean;
  onClose: () => void;
  onSave: (id: number, patch: ContactPatch) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export function CrmModal({ contact, columns, busy, onClose, onSave, onDelete }: CrmModalProps) {
  const [name, setName] = useState(contact.name);
  const [org, setOrg] = useState(contact.org || '');
  const [phone, setPhone] = useState(contact.phone || '');
  const [email, setEmail] = useState(contact.email || '');
  const [value, setValue] = useState<string>(contact.value != null ? String(contact.value) : '');
  const [status, setStatus] = useState(contact.status);
  const [nextAction, setNextAction] = useState(contact.next_action || '');
  const [nextDate, setNextDate] = useState(contact.next_date || '');
  const [notes, setNotes] = useState(contact.notes || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const confirmDeleteRef = useRef(false);
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  // Focus le bouton sûr (Annuler) quand la confirmation s'ouvre.
  useEffect(() => {
    confirmDeleteRef.current = confirmDelete;
    if (confirmDelete) {
      const t = setTimeout(() => confirmCancelRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [confirmDelete]);

  // Échap (ferme d'abord la confirmation), focus initial, focus-trap Tab, blocage scroll body.
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const tmr = setTimeout(() => firstFieldRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (confirmDeleteRef.current) setConfirmDelete(false);
        else onClose();
        return;
      }
      if (e.key === 'Tab') {
        const root = dialogRef.current;
        if (!root) return;
        const f = root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        );
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(tmr);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const working = saving || busy;

  const save = async () => {
    setSaving(true);
    try {
      const parsed = value.trim() === '' ? null : Number(value.replace(',', '.'));
      await onSave(contact.id, {
        name: name.trim() || contact.name,
        org: org.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        value: parsed != null && Number.isNaN(parsed) ? null : parsed,
        status,
        next_action: nextAction.trim() || null,
        next_date: nextDate || null,
        notes: notes.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={overlayRef} style={styles.overlay} className="crm-overlay"
      onMouseDown={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Fiche prospect"
        style={styles.modal} className="crm-modal">
        <CrmModalStyles />

        <div style={styles.head}>
          <span style={styles.eyebrow}>Fiche prospect</span>
          <button type="button" onClick={onClose} style={styles.closeBtn} className="modal-close" aria-label="Fermer"><span aria-hidden="true">×</span></button>
        </div>

        <div style={styles.body}>
          <label style={styles.label} htmlFor="crm-name">Nom *</label>
          <input id="crm-name" ref={firstFieldRef} value={name} onChange={(e) => setName(e.target.value)}
            style={styles.input} className="modal-field" placeholder="Nom du prospect ou de la structure" />

          <label style={styles.label} htmlFor="crm-org">Structure (optionnel)</label>
          <input id="crm-org" value={org} onChange={(e) => setOrg(e.target.value)}
            style={styles.input} className="modal-field" placeholder="EHPAD, école, entreprise…" />

          <div style={styles.row2}>
            <div style={styles.col}>
              <label style={styles.label} htmlFor="crm-phone">Téléphone</label>
              <input id="crm-phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                style={styles.input} className="modal-field" inputMode="tel" placeholder="06…" />
            </div>
            <div style={styles.col}>
              <label style={styles.label} htmlFor="crm-email">Email</label>
              <input id="crm-email" value={email} onChange={(e) => setEmail(e.target.value)}
                style={styles.input} className="modal-field" inputMode="email" placeholder="nom@exemple.fr" />
            </div>
          </div>

          {(phone.trim() || email.trim()) && (
            <div style={styles.contactLinks}>
              {phone.trim() && <a href={`tel:${phone.trim()}`} style={styles.contactLink} className="modal-field">📞 Appeler</a>}
              {email.trim() && <a href={`mailto:${email.trim()}`} style={styles.contactLink} className="modal-field">✉ Écrire</a>}
            </div>
          )}

          <label style={styles.label} htmlFor="crm-value">Valeur estimée (€)</label>
          <input id="crm-value" value={value} onChange={(e) => setValue(e.target.value)}
            style={styles.input} className="modal-field" inputMode="decimal" placeholder="ex. 490" />

          <span style={styles.label}>Étape</span>
          <div style={styles.statusRow} role="group" aria-label="Étape">
            {columns.map((c) => {
              const active = status === c.status;
              return (
                <button key={c.status} type="button" onClick={() => setStatus(c.status)} aria-pressed={active}
                  style={{ ...styles.statusBtn, ...(active ? styles.statusBtnActive : {}) }} className="status-btn">
                  <span style={{ ...styles.statusDot, background: c.dot }} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <label style={styles.label} htmlFor="crm-action">Prochaine action</label>
          <input id="crm-action" value={nextAction} onChange={(e) => setNextAction(e.target.value)}
            style={styles.input} className="modal-field" placeholder="ex. Renvoyer le devis" />

          <label style={styles.label} htmlFor="crm-date">Date de relance</label>
          <input id="crm-date" type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)}
            style={styles.input} className="modal-field" />

          <label style={styles.label} htmlFor="crm-notes">Notes</label>
          <textarea id="crm-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
            style={styles.textarea} className="modal-field" placeholder="Contexte, historique, points à retenir…" />
        </div>

        <div style={styles.foot}>
          <button type="button" onClick={() => setConfirmDelete(true)} disabled={working}
            style={styles.deleteBtn} className="delete-btn"><span aria-hidden="true">✕</span> Supprimer</button>
          <div style={styles.footRight}>
            <button type="button" onClick={onClose} disabled={working} style={styles.cancelBtn} className="cancel-btn">Fermer</button>
            <button type="button" onClick={save} disabled={working || !name.trim()}
              style={{ ...styles.saveBtn, ...(working || !name.trim() ? styles.disabled : {}) }}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </div>

        {confirmDelete && (
          <div style={styles.confirmOverlay} className="confirm-overlay"
            onMouseDown={(e) => { if (e.currentTarget === e.target) setConfirmDelete(false); }}>
            <div role="alertdialog" aria-modal="true" aria-label="Confirmer la suppression" style={styles.confirmBox} className="confirm-box">
              <h2 style={styles.confirmTitle}>Supprimer ce prospect ?</h2>
              <p style={styles.confirmDesc}>Cette action est définitive.</p>
              <div style={styles.confirmActions}>
                <button type="button" ref={confirmCancelRef} onClick={() => setConfirmDelete(false)} disabled={working}
                  style={styles.confirmCancel} className="confirm-box-cancel">Annuler</button>
                <button type="button" onClick={() => onDelete(contact.id)} disabled={working}
                  style={{ ...styles.confirmDelete, ...(working ? styles.disabled : {}) }} className="confirm-box-delete">
                  <span aria-hidden="true">✕</span> Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CrmModalStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
.crm-modal .modal-field:focus { outline: none; border-color: ${ACCENT}; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.crm-modal .status-btn:hover { border-color: ${ACCENT}88; }
.crm-modal .modal-close:hover { color: ${INK}; background: ${PAPER}; }
.crm-modal .delete-btn:hover:not(:disabled) { background: #fef2f2; }
.crm-modal .cancel-btn:hover:not(:disabled) { background: ${PAPER}; }
.crm-modal a.modal-field { text-decoration: none; }
@keyframes crm-overlay-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes crm-modal-in { from { opacity: 0; transform: translateY(12px) scale(0.985); } to { opacity: 1; transform: none; } }
.crm-overlay { animation: crm-overlay-in 0.15s ease-out; }
.crm-modal { animation: crm-modal-in 0.18s ease-out; }
` }} />
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex',
    alignItems: 'flex-start', justifyContent: 'center', padding: 'clamp(0.75rem, 4vw, 2.5rem) 1rem',
    zIndex: 1000, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
  },
  modal: {
    background: '#fff', border: `1px solid ${LINE}`, borderRadius: '16px', width: '100%', maxWidth: '34rem',
    margin: 'auto', boxShadow: '0 20px 60px rgba(15,23,42,0.28)', display: 'flex', flexDirection: 'column',
    maxHeight: 'calc(100vh - 2rem)', overflow: 'hidden', color: INK, fontFamily: SANS,
  },
  head: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1.1rem',
    borderBottom: `1px solid ${LINE}`, background: PAPER, flexShrink: 0,
  },
  eyebrow: { fontSize: '0.72rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: ACCENT, fontWeight: 800 },
  closeBtn: {
    width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', color: MUTED, border: 'none', borderRadius: '8px', cursor: 'pointer',
    fontSize: '1.5rem', lineHeight: 1, transition: 'color 0.15s, background 0.15s',
  },
  body: { padding: '1.1rem', overflowY: 'auto', flex: 1 },
  label: {
    display: 'block', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase',
    fontWeight: 800, color: MUTED, margin: '0.25rem 0 0.4rem',
  },
  input: {
    width: '100%', padding: '0.6rem 0.8rem', background: '#fff', color: INK, border: `1px solid ${LINE}`,
    borderRadius: '10px', fontSize: '1rem', fontFamily: SANS, boxSizing: 'border-box', marginBottom: '1rem',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  row2: { display: 'flex', gap: '0.6rem' },
  col: { flex: 1, minWidth: 0 },
  contactLinks: { display: 'flex', gap: '0.5rem', margin: '-0.4rem 0 1rem' },
  contactLink: {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.8rem', background: PAPER,
    border: `1px solid ${LINE}`, borderRadius: '999px', color: ACCENT, fontSize: '0.85rem', fontWeight: 700,
  },
  statusRow: { display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' },
  statusBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.7rem', background: '#fff',
    color: INK, border: `1px solid ${LINE}`, borderRadius: '999px', cursor: 'pointer', fontSize: '0.82rem',
    fontWeight: 700, fontFamily: SANS, transition: 'border-color 0.15s, background 0.15s',
  },
  statusBtnActive: { background: ACCENT, color: '#fff', borderColor: ACCENT },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  textarea: {
    width: '100%', padding: '0.65rem 0.8rem', background: '#fff', color: INK, border: `1px solid ${LINE}`,
    borderRadius: '10px', fontSize: '0.95rem', lineHeight: 1.55, fontFamily: SANS, boxSizing: 'border-box',
    resize: 'vertical', marginBottom: '0.5rem', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  foot: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', padding: '0.85rem 1.1rem',
    borderTop: `1px solid ${LINE}`, background: PAPER, flexShrink: 0, flexWrap: 'wrap',
  },
  footRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  deleteBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', background: '#fff',
    color: DANGER, border: `1px solid ${DANGER_SOFT}`, borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem',
    fontWeight: 800, fontFamily: SANS, transition: 'background 0.15s',
  },
  cancelBtn: {
    padding: '0.55rem 1rem', background: '#fff', color: MUTED, border: `1px solid ${LINE}`, borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, fontFamily: SANS, transition: 'background 0.15s',
  },
  saveBtn: {
    padding: '0.55rem 1.4rem', background: ACCENT, color: '#fff', border: 'none', borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.9rem', fontWeight: 800, fontFamily: SANS,
  },
  disabled: { opacity: 0.55, cursor: 'default' },
  confirmOverlay: {
    position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', padding: '1.25rem', zIndex: 10,
  },
  confirmBox: {
    background: '#fff', border: `1px solid ${LINE}`, borderRadius: '14px', padding: '1.3rem 1.3rem 1.1rem',
    width: '100%', maxWidth: '22rem', boxShadow: '0 16px 44px rgba(15,23,42,0.3)', textAlign: 'center',
  },
  confirmTitle: { fontSize: '1.15rem', fontWeight: 800, color: INK, margin: '0 0 0.4rem' },
  confirmDesc: { fontSize: '0.92rem', lineHeight: 1.5, color: MUTED, margin: '0 0 1.1rem' },
  confirmActions: { display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' },
  confirmCancel: {
    minHeight: 42, padding: '0.55rem 1.2rem', background: '#fff', color: INK, border: `1px solid ${LINE}`,
    borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, fontFamily: SANS,
  },
  confirmDelete: {
    display: 'inline-flex', alignItems: 'center', gap: '0.4rem', minHeight: 42, padding: '0.55rem 1.3rem',
    background: DANGER, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.9rem',
    fontWeight: 800, fontFamily: SANS,
  },
};
