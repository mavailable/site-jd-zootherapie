import { useState } from 'react';
import type { SaleLine } from './crmTypes';
import { parseAmount, saleTotal } from './saleHelpers';
import { formatEuro } from './crmHelpers';

const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626';
const SANS = '-apple-system, system-ui, sans-serif';

export interface Billing {
  address: string; postal: string; city: string; contact: string; siret: string; orderRef: string;
}

interface SaleSectionProps {
  open: boolean;
  onToggle: () => void;
  billing: Billing;
  setBilling: (patch: Partial<Billing>) => void;
  showSiret: boolean;
  showOrderRef: boolean;
  setLines: (lines: SaleLine[]) => void;
  initialLines: SaleLine[];
  saleDate: string;
  setSaleDate: (d: string) => void;
}

interface Row { label: string; qty: string; unit_price: string; }

export function SaleSection({ open, onToggle, billing, setBilling, showSiret, showOrderRef, setLines, initialLines, saleDate, setSaleDate }: SaleSectionProps) {
  // Lignes éditées en chaînes (saisie fluide, décimales virgule) ; on pousse au parent en nombres.
  const [rows, setRows] = useState<Row[]>(() =>
    initialLines.length
      ? initialLines.map((l) => ({ label: l.label, qty: String(l.qty ?? ''), unit_price: String(l.unit_price ?? '') }))
      : []
  );

  const toLines = (rs: Row[]): SaleLine[] =>
    rs.map((r) => ({ label: r.label, qty: parseAmount(r.qty), unit_price: parseAmount(r.unit_price) }));

  const pushUp = (next: Row[]) => { setRows(next); setLines(toLines(next)); };
  const setRow = (i: number, patch: Partial<Row>) => pushUp(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRow = () => pushUp([...rows, { label: '', qty: '1', unit_price: '' }]);
  const removeRow = (i: number) => pushUp(rows.filter((_, j) => j !== i));

  const total = saleTotal(toLines(rows));

  return (
    <div style={styles.wrap}>
      <button type="button" onClick={onToggle} style={styles.header} aria-expanded={open} className="sale-header">
        <span style={styles.htitle}>💶 Facturation &amp; vente</span>
        <span style={styles.chev} aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div style={styles.body}>
          <label style={styles.label} htmlFor="bill-addr">Adresse de facturation</label>
          <input id="bill-addr" value={billing.address} onChange={(e) => setBilling({ address: e.target.value })}
            style={styles.input} placeholder="Rue" className="modal-field" />
          <div style={styles.row2}>
            <input value={billing.postal} onChange={(e) => setBilling({ postal: e.target.value })}
              style={{ ...styles.input, flex: '0 0 8rem' }} placeholder="Code postal" className="modal-field" aria-label="Code postal" />
            <input value={billing.city} onChange={(e) => setBilling({ city: e.target.value })}
              style={{ ...styles.input, flex: 1 }} placeholder="Ville" className="modal-field" aria-label="Ville" />
          </div>
          <label style={styles.label} htmlFor="bill-contact">À l'attention de</label>
          <input id="bill-contact" value={billing.contact} onChange={(e) => setBilling({ contact: e.target.value })}
            style={styles.input} placeholder="Nom du destinataire (optionnel)" className="modal-field" />

          {showSiret && (
            <>
              <label style={styles.label} htmlFor="bill-siret">SIRET client</label>
              <input id="bill-siret" value={billing.siret} onChange={(e) => setBilling({ siret: e.target.value })}
                style={styles.input} placeholder="(optionnel)" className="modal-field" />
            </>
          )}
          {showOrderRef && (
            <>
              <label style={styles.label} htmlFor="bill-ref">Référence / bon de commande</label>
              <input id="bill-ref" value={billing.orderRef} onChange={(e) => setBilling({ orderRef: e.target.value })}
                style={styles.input} placeholder="(optionnel)" className="modal-field" />
            </>
          )}

          <span style={styles.label}>Lignes de vente</span>
          <div style={styles.linesHead}>
            <span style={{ flex: 1 }}>Désignation</span>
            <span style={styles.qtyH}>Qté</span>
            <span style={styles.puH}>PU net €</span>
            <span style={{ width: 28 }} />
          </div>
          {rows.length === 0 && <p style={styles.empty}>Aucune ligne. Ajoute une prestation.</p>}
          {rows.map((r, i) => (
            <div key={i} style={styles.lineRow}>
              <input value={r.label} onChange={(e) => setRow(i, { label: e.target.value })}
                style={{ ...styles.input, flex: 1, marginBottom: 0 }} placeholder="ex. Séance de médiation animale" className="modal-field" aria-label="Désignation" />
              <input value={r.qty} onChange={(e) => setRow(i, { qty: e.target.value })}
                style={{ ...styles.input, width: '3.5rem', marginBottom: 0 }} inputMode="decimal" className="modal-field" aria-label="Quantité" />
              <input value={r.unit_price} onChange={(e) => setRow(i, { unit_price: e.target.value })}
                style={{ ...styles.input, width: '5rem', marginBottom: 0 }} inputMode="decimal" placeholder="0,00" className="modal-field" aria-label="Prix unitaire net" />
              <button type="button" onClick={() => removeRow(i)} style={styles.lineDel} aria-label="Supprimer la ligne">✕</button>
            </div>
          ))}
          <button type="button" onClick={addRow} style={styles.addLine}>+ ligne</button>

          <div style={styles.totalRow}>
            <span>Total net</span>
            <strong style={styles.totalVal}>{formatEuro(total)}</strong>
          </div>

          <label style={styles.label} htmlFor="sale-date">Date de vente</label>
          <input id="sale-date" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)}
            style={styles.input} className="modal-field" />
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { marginTop: '0.75rem', border: `1px solid ${LINE}`, borderRadius: '12px', overflow: 'hidden' },
  header: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 0.9rem', background: PAPER, border: 'none', cursor: 'pointer', fontFamily: SANS, color: INK },
  htitle: { fontSize: '0.85rem', fontWeight: 800 },
  chev: { color: MUTED, fontSize: '0.9rem' },
  body: { padding: '0.9rem', borderTop: `1px solid ${LINE}`, background: '#fff' },
  label: { display: 'block', fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 800, color: MUTED, margin: '0.25rem 0 0.4rem' },
  input: { width: '100%', padding: '0.5rem 0.7rem', background: '#fff', color: INK, border: `1px solid ${LINE}`, borderRadius: '9px', fontSize: '0.9rem', fontFamily: SANS, boxSizing: 'border-box', marginBottom: '0.7rem' },
  row2: { display: 'flex', gap: '0.5rem' },
  linesHead: { display: 'flex', gap: '0.4rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: MUTED, fontWeight: 800, padding: '0 0.1rem 0.3rem' },
  qtyH: { width: '3.5rem', textAlign: 'center' },
  puH: { width: '5rem', textAlign: 'center' },
  empty: { fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: '0.2rem 0 0.5rem' },
  lineRow: { display: 'flex', gap: '0.4rem', alignItems: 'center', marginBottom: '0.5rem' },
  lineDel: { width: 28, height: 28, flexShrink: 0, border: '1px solid #fecaca', background: '#fff', color: DANGER, borderRadius: '7px', cursor: 'pointer', fontWeight: 800 },
  addLine: { padding: '0.4rem 0.8rem', background: '#fff', border: `1px dashed ${ACCENT}`, color: ACCENT, borderRadius: '9px', cursor: 'pointer', fontWeight: 700, fontFamily: SANS, fontSize: '0.85rem' },
  totalRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.8rem', paddingTop: '0.7rem', borderTop: `1px solid ${LINE}`, fontSize: '0.9rem', fontWeight: 700, color: INK },
  totalVal: { fontSize: '1.05rem', color: INK },
};
