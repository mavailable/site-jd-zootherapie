import { useState, useMemo } from 'react';
import type { CmsConfig } from '../../../../cms.types';
import { useCrm } from './useCrm';
import { CrmModal } from './CrmModal';
import { relance, isDue, urgencyRank, sortColumn, formatEuro, todayParisISO } from './crmHelpers';
import type { Contact, ContactPatch, CrmColumn } from './crmTypes';

// Palette admin jd-zoo (chrome neutre slate + accent bleu).
const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626';
const SANS = '-apple-system, system-ui, sans-serif';

const DEFAULT_COLUMNS: CrmColumn[] = [
  { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
  { status: 'contacte', label: 'Contacté', hint: 'Premier contact', dot: '#3b82f6' },
  { status: 'rdv', label: 'RDV / échange', hint: 'En discussion', dot: '#0ea5e9' },
  { status: 'devis', label: 'Devis envoyé', hint: 'Proposition faite', dot: '#f59e0b' },
  { status: 'gagne', label: 'Gagné', hint: 'Conclu ✅', dot: '#16a34a' },
  { status: 'perdu', label: 'Perdu', hint: 'Sans suite', dot: '#cbd5e1' },
];

export function CrmTab({ config }: { config: CmsConfig }) {
  const columns = (config.crm?.columns as CrmColumn[] | undefined) || DEFAULT_COLUMNS;
  const { contacts, loading, error, reload, create, update, remove } = useCrm();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const today = todayParisISO();

  // Navigation linéaire dérivée de l'ordre des colonnes.
  const order = columns.map((c) => c.status);
  const NEXT: Record<string, string | null> = Object.fromEntries(
    order.map((s, i) => [s, i < order.length - 1 ? order[i + 1] : null])
  );
  const PREV: Record<string, string | null> = Object.fromEntries(
    order.map((s, i) => [s, i > 0 ? order[i - 1] : null])
  );
  const firstStatus = order[0];

  const dueList = useMemo(
    () =>
      contacts
        .filter((c) => isDue(relance(c.next_date, today)))
        .sort((a, b) => urgencyRank(relance(a.next_date, today)) - urgencyRank(relance(b.next_date, today))),
    [contacts, today]
  );

  const byStatus = (status: string) => sortColumn(contacts.filter((c) => c.status === status), today);
  const openContact = openId != null ? contacts.find((c) => c.id === openId) || null : null;

  const addContact = async () => {
    const name = newName.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      setNewName('');
      await create({ name, status: firstStatus });
    } finally {
      setBusy(false);
    }
  };

  const move = async (c: Contact, dir: 'next' | 'prev') => {
    if (busy) return;
    const target = dir === 'next' ? NEXT[c.status] : PREV[c.status];
    if (!target) return;
    setBusy(true);
    try {
      await update(c.id, { status: target });
    } finally {
      setBusy(false);
    }
  };

  const saveContact = async (id: number, patch: ContactPatch) => {
    setBusy(true);
    try {
      await update(id, patch);
    } finally {
      setBusy(false);
    }
  };

  const deleteContact = async (id: number) => {
    setBusy(true);
    try {
      await remove(id);
      if (openId === id) setOpenId(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.shell} className="crm-tab">
      <CrmStyles />

      <header style={styles.intro}>
        <p style={styles.eyebrow}>Suivi commercial</p>
        <h1 style={styles.title}>Prospects</h1>
        <p style={styles.lede}>
          Suis tes prospects et clients du premier contact jusqu'à la signature. Ajoute une fiche,
          fais-la avancer d'étape avec les flèches, et note une date de relance pour ne rien oublier.
        </p>
      </header>

      <div style={styles.addBar}>
        <input value={newName} onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addContact(); }}
          placeholder="Ajouter un prospect (nom) et appuyer sur Entrée…"
          style={styles.addInput} className="crm-field" disabled={busy} aria-label="Nouveau prospect" />
        <button type="button" onClick={addContact} disabled={busy || !newName.trim()}
          style={{ ...styles.addBtn, ...(busy || !newName.trim() ? styles.addBtnDisabled : {}) }}>
          Ajouter
        </button>
      </div>

      {!loading && !error && (
        <div style={styles.banner}>
          {dueList.length === 0 ? (
            <p style={styles.bannerEmpty}>Rien à relancer aujourd'hui ✅</p>
          ) : (
            <>
              <p style={styles.bannerTitle}>🔔 À relancer ({dueList.length})</p>
              <ul style={styles.bannerList}>
                {dueList.map((c) => {
                  const r = relance(c.next_date, today);
                  const tag =
                    r.kind === 'overdue' ? `en retard (${r.days}j)` :
                    r.kind === 'today' ? "aujourd'hui" : `dans ${r.days}j`;
                  const color = r.kind === 'overdue' ? DANGER : r.kind === 'today' ? '#b45309' : ACCENT;
                  return (
                    <li key={c.id}>
                      <button type="button" style={styles.bannerItem} className="banner-item" onClick={() => setOpenId(c.id)}>
                        <span style={styles.bannerName}>{c.name}</span>
                        <span style={{ ...styles.bannerTag, color }}>{tag}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}

      {loading && <div style={styles.loadingBox}>Chargement…</div>}
      {error && !loading && (
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error}</p>
          <button onClick={reload} style={styles.retryBtn}>Réessayer</button>
        </div>
      )}

      {!loading && !error && (
        <div style={{ ...styles.board, gridTemplateColumns: `repeat(${columns.length}, minmax(190px, 1fr))` }}>
          {columns.map((col) => {
            const list = byStatus(col.status);
            return (
              <section key={col.status} style={styles.column} aria-label={col.label}>
                <div style={styles.colHead}>
                  <span style={{ ...styles.colDot, background: col.dot }} />
                  <h2 style={styles.colTitle}>{col.label}</h2>
                  <span style={styles.colCount}>{list.length}</span>
                </div>
                <p style={styles.colHint}>{col.hint}</p>
                <div style={styles.cards}>
                  {list.length === 0 && <p style={styles.empty}>Vide pour l'instant.</p>}
                  {list.map((c) => {
                    const r = relance(c.next_date, today);
                    const pastille =
                      r.kind === 'overdue' ? { txt: `⚠ Relance en retard (${r.days}j)`, col: DANGER } :
                      r.kind === 'today' ? { txt: "⏰ Relance aujourd'hui", col: '#b45309' } :
                      r.kind === 'soon' ? { txt: `📅 Relance dans ${r.days}j`, col: ACCENT } :
                      r.kind === 'later' && c.next_date ? { txt: `📅 ${c.next_date}`, col: MUTED } : null;
                    return (
                      <article key={c.id} style={styles.card} className="crm-card" role="button"
                        tabIndex={0} aria-label={`Ouvrir ${c.name}`}
                        onClick={() => setOpenId(c.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenId(c.id); } }}>
                        <p style={styles.cardName}>{c.name}</p>
                        {c.org && <p style={styles.cardOrg}>{c.org}</p>}
                        {pastille && <p style={{ ...styles.cardRelance, color: pastille.col }}>{pastille.txt}</p>}
                        {c.next_action && <p style={styles.cardAction}>➡ {c.next_action}</p>}
                        <div style={styles.cardMeta}>
                          {c.value != null && <span style={styles.cardValue}>{formatEuro(c.value)}</span>}
                          {c.phone && <span style={styles.cardBadge} title={c.phone}>📞</span>}
                          {c.email && <span style={styles.cardBadge} title={c.email}>✉</span>}
                        </div>
                        <div style={styles.cardActions}>
                          <button type="button" className="move-btn"
                            onClick={(e) => { e.stopPropagation(); move(c, 'prev'); }}
                            disabled={busy || !PREV[c.status]}
                            style={{ ...styles.moveBtn, ...(!PREV[c.status] ? styles.moveHidden : {}) }}
                            aria-label="Étape précédente">←</button>
                          <button type="button" className="move-btn"
                            onClick={(e) => { e.stopPropagation(); move(c, 'next'); }}
                            disabled={busy || !NEXT[c.status]}
                            style={{ ...styles.moveBtn, ...(!NEXT[c.status] ? styles.moveHidden : {}) }}
                            aria-label="Étape suivante">→</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {busy && <p style={styles.savingNote}>Enregistrement…</p>}

      {openContact && (
        <CrmModal key={openContact.id} contact={openContact} columns={columns} busy={busy}
          onClose={() => setOpenId(null)} onSave={saveContact} onDelete={deleteContact} />
      )}
    </div>
  );
}

function CrmStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
.crm-tab .crm-field:focus { outline: none; border-color: ${ACCENT}; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.crm-tab .crm-card { transition: box-shadow 0.15s, border-color 0.15s, transform 0.05s; }
.crm-tab .crm-card:hover { border-color: ${ACCENT}66; box-shadow: 0 4px 16px rgba(15,23,42,0.10); }
.crm-tab .crm-card:active { transform: translateY(1px); }
.crm-tab .crm-card:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
.crm-tab .move-btn:hover:not(:disabled) { background: ${ACCENT}; color: #fff; border-color: ${ACCENT}; }
.crm-tab .banner-item:hover { background: #fff; border-color: ${ACCENT}55; }
.crm-tab .banner-item:focus-visible { outline: 2px solid ${ACCENT}; outline-offset: 2px; }
` }} />
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    background: PAPER, borderRadius: '16px', padding: 'clamp(1.1rem, 3vw, 2.25rem)', margin: '0 auto',
    boxShadow: '0 8px 36px rgba(15,23,42,0.06)', border: `1px solid ${LINE}`, color: INK, fontFamily: SANS,
  },
  intro: { maxWidth: '52rem', margin: '0 auto 1.5rem', paddingBottom: '1.25rem', borderBottom: `1px solid ${LINE}` },
  eyebrow: { fontSize: '0.72rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: ACCENT, margin: '0 0 0.5rem', fontWeight: 700 },
  title: { fontWeight: 800, fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', lineHeight: 1.05, color: INK, margin: '0 0 0.6rem' },
  lede: { fontSize: '1rem', lineHeight: 1.6, color: MUTED, margin: 0, maxWidth: '44rem' },

  addBar: { display: 'flex', gap: '0.6rem', maxWidth: '52rem', margin: '0 auto 1.25rem' },
  addInput: {
    flex: 1, padding: '0.7rem 0.9rem', background: '#fff', color: INK, border: `1px solid ${LINE}`,
    borderRadius: '10px', fontSize: '1rem', fontFamily: SANS, boxSizing: 'border-box', transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  addBtn: {
    padding: '0.7rem 1.4rem', background: ACCENT, color: '#fff', border: 'none', borderRadius: '10px',
    cursor: 'pointer', fontSize: '0.95rem', fontWeight: 800, fontFamily: SANS, flexShrink: 0,
  },
  addBtnDisabled: { opacity: 0.55, cursor: 'default' },

  banner: {
    maxWidth: '52rem', margin: '0 auto 1.5rem', padding: '0.9rem 1.1rem', background: '#fff',
    border: `1px solid ${LINE}`, borderRadius: '12px',
  },
  bannerEmpty: { margin: 0, fontSize: '0.92rem', color: MUTED, fontWeight: 600 },
  bannerTitle: { margin: '0 0 0.6rem', fontSize: '0.95rem', fontWeight: 800, color: INK },
  bannerList: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' },
  bannerItem: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.6rem',
    padding: '0.5rem 0.7rem', background: PAPER, border: `1px solid ${LINE}`, borderRadius: '8px',
    cursor: 'pointer', fontFamily: SANS, textAlign: 'left', transition: 'background 0.15s, border-color 0.15s',
  },
  bannerName: { fontSize: '0.9rem', fontWeight: 700, color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  bannerTag: { fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 },

  loadingBox: { textAlign: 'center', padding: '2rem', color: MUTED },
  errorBox: { maxWidth: '52rem', margin: '0 auto', textAlign: 'center', padding: '2rem 1.5rem', color: MUTED },
  errorText: { color: '#b91c1c', marginBottom: '1rem', fontSize: '0.95rem' },
  retryBtn: { padding: '0.5rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, color: '#fff', background: ACCENT, border: 'none', borderRadius: '8px', cursor: 'pointer' },

  board: { display: 'grid', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem', margin: 0 },
  column: { background: '#fff', border: `1px solid ${LINE}`, borderRadius: '14px', padding: '1rem 0.9rem', minHeight: '180px' },
  colHead: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' },
  colDot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  colTitle: { fontWeight: 800, fontSize: '1rem', color: INK, margin: 0, flex: 1 },
  colCount: { fontSize: '0.8rem', fontWeight: 800, color: MUTED, background: PAPER, borderRadius: '999px', padding: '0.1rem 0.55rem' },
  colHint: { fontSize: '0.78rem', color: MUTED, fontStyle: 'italic', margin: '0 0 0.85rem' },
  cards: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  empty: { fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', margin: '0.25rem 0' },

  card: { background: PAPER, border: `1px solid ${LINE}`, borderRadius: '10px', padding: '0.7rem 0.75rem', cursor: 'pointer' },
  cardName: { fontSize: '0.95rem', lineHeight: 1.35, color: INK, margin: '0 0 0.15rem', fontWeight: 700 },
  cardOrg: { fontSize: '0.8rem', color: MUTED, margin: '0 0 0.4rem' },
  cardRelance: { fontSize: '0.78rem', fontWeight: 800, margin: '0 0 0.35rem' },
  cardAction: { fontSize: '0.82rem', color: MUTED, margin: '0 0 0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.55rem', flexWrap: 'wrap' },
  cardValue: { fontSize: '0.78rem', fontWeight: 800, color: INK, background: '#fff', border: `1px solid ${LINE}`, borderRadius: '999px', padding: '0.08rem 0.5rem' },
  cardBadge: { fontSize: '0.85rem' },
  cardActions: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.35rem' },
  moveBtn: {
    width: 36, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fff',
    color: ACCENT, border: `1px solid ${LINE}`, borderRadius: '8px', cursor: 'pointer', fontSize: '1.05rem',
    fontWeight: 700, lineHeight: 1, transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  },
  moveHidden: { visibility: 'hidden' },
  savingNote: { textAlign: 'center', color: MUTED, fontSize: '0.82rem', marginTop: '1rem', fontStyle: 'italic' },
};
