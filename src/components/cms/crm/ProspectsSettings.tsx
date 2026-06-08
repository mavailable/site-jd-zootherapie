import { useState, useEffect } from 'react';
import { useCrmSettings } from './useCrmSettings';
import { genColumnId } from './crmSettings';
import type { CrmSettingsColumn } from './crmTypes';

const INK = '#0f172a', MUTED = '#64748b', LINE = '#e2e8f0', PAPER = '#f8fafc';
const ACCENT = '#3b82f6', DANGER = '#dc2626', SUCCESS = '#16a34a';
const SANS = '-apple-system, system-ui, sans-serif';
const PALETTE = ['#94a3b8', '#3b82f6', '#0ea5e9', '#f59e0b', '#16a34a', '#cbd5e1', '#a855f7', '#ef4444'];

export function ProspectsSettings() {
  const { settings, loading, error, save } = useCrmSettings();
  const [cols, setCols] = useState<CrmSettingsColumn[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<string>('');

  // Copie locale éditable, synchronisée au chargement des settings.
  useEffect(() => { setCols(settings.columns.map((c) => ({ ...c }))); }, [settings.columns]);

  // Comptage des fiches par statut (pour la suppression sûre).
  useEffect(() => {
    fetch('/api/crm/contacts', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => {
        const m: Record<string, number> = {};
        for (const c of (d.contacts || [])) m[c.status] = (m[c.status] || 0) + 1;
        setCounts(m);
      })
      .catch(() => {});
  }, []);

  const setCol = (i: number, patch: Partial<CrmSettingsColumn>) =>
    setCols((p) => p.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: 'up' | 'down') =>
    setCols((p) => {
      const j = dir === 'up' ? i - 1 : i + 1;
      if (j < 0 || j >= p.length) return p;
      const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  const addCol = () =>
    setCols((p) => [...p, { id: genColumnId('Nouvelle colonne', p.map((c) => c.id)), label: 'Nouvelle colonne', hint: '', color: PALETTE[0] }]);

  const saveAll = async () => {
    setBusy(true); setMsg(null);
    try {
      const clean = cols.map((c) => ({ ...c, label: c.label.trim() || 'Sans titre' }));
      await save({ columns: clean, fields: settings.fields });
      setMsg({ kind: 'ok', text: 'Réglages enregistrés.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : "Échec de l'enregistrement." });
    } finally { setBusy(false); }
  };

  const requestDelete = (id: string) => {
    if (cols.length <= 1) { setMsg({ kind: 'err', text: 'Il faut au moins une colonne.' }); return; }
    if ((counts[id] || 0) > 0) {
      setConfirmDel(id);
      setMoveTarget(cols.find((c) => c.id !== id)!.id);
    } else {
      setCols((p) => p.filter((c) => c.id !== id)); // colonne vide : retrait local, appliqué au Enregistrer
    }
  };

  const confirmDelete = async () => {
    const id = confirmDel!; const target = moveTarget;
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/crm/contacts', { credentials: 'same-origin' });
      const d = await r.json();
      const toMove = (d.contacts || []).filter((c: any) => c.status === id);
      for (const c of toMove) {
        const pr = await fetch(`/api/crm/contacts/${c.id}`, {
          method: 'PATCH', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: target }),
        });
        if (!pr.ok) throw new Error('Déplacement interrompu');
      }
      const nextCols = cols.filter((c) => c.id !== id);
      await save({ columns: nextCols, fields: settings.fields });
      setCols(nextCols);
      setCounts((m) => { const n = { ...m }; n[target] = (n[target] || 0) + (n[id] || 0); delete n[id]; return n; });
      setConfirmDel(null);
      setMsg({ kind: 'ok', text: 'Colonne supprimée, prospects déplacés.' });
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof Error ? e.message : 'Échec.' });
    } finally { setBusy(false); }
  };

  if (loading) return <p style={{ color: MUTED, fontFamily: SANS }}>Chargement…</p>;

  return (
    <div style={styles.shell}>
      <h2 style={styles.h2}>Colonnes du funnel</h2>
      <p style={styles.help}>Renomme, réordonne, ajoute ou retire les étapes de ton suivi. Renommer ne déplace aucun prospect.</p>
      {error && <p style={styles.errLine}>{error}</p>}

      <div style={styles.list}>
        {cols.map((c, i) => (
          <div key={c.id} style={styles.row}>
            <div style={styles.moves}>
              <button type="button" onClick={() => move(i, 'up')} disabled={i === 0} style={styles.mv} aria-label="Monter">↑</button>
              <button type="button" onClick={() => move(i, 'down')} disabled={i === cols.length - 1} style={styles.mv} aria-label="Descendre">↓</button>
            </div>
            <input value={c.label} onChange={(e) => setCol(i, { label: e.target.value })} style={styles.inLabel} placeholder="Libellé" aria-label="Libellé de la colonne" />
            <input value={c.hint} onChange={(e) => setCol(i, { hint: e.target.value })} style={styles.inHint} placeholder="Indice (optionnel)" aria-label="Indice" />
            <div style={styles.colors}>
              {PALETTE.map((p) => (
                <button key={p} type="button" onClick={() => setCol(i, { color: p })} title={p} aria-label={`Couleur ${p}`}
                  style={{ ...styles.swatch, background: p, outline: c.color === p ? `2px solid ${INK}` : 'none', outlineOffset: '1px' }} />
              ))}
            </div>
            <span style={styles.count}>{counts[c.id] ? `${counts[c.id]} fiche${counts[c.id] > 1 ? 's' : ''}` : ''}</span>
            <button type="button" onClick={() => requestDelete(c.id)} disabled={busy} style={styles.del} aria-label="Supprimer la colonne">✕</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addCol} style={styles.add}>+ Ajouter une colonne</button>

      <div style={styles.footer}>
        {msg && <span style={{ color: msg.kind === 'ok' ? SUCCESS : DANGER, fontWeight: 700, fontSize: '0.88rem' }}>{msg.text}</span>}
        <button type="button" onClick={saveAll} disabled={busy} style={styles.save}>{busy ? '…' : 'Enregistrer'}</button>
      </div>

      {confirmDel && (
        <div style={styles.overlay} onMouseDown={(e) => { if (e.currentTarget === e.target) setConfirmDel(null); }}>
          <div style={styles.dialog} role="alertdialog" aria-modal="true" aria-label="Confirmer la suppression de colonne">
            <h3 style={styles.dh}>Supprimer cette colonne ?</h3>
            <p style={styles.dp}>Elle contient {counts[confirmDel]} prospect(s). Déplace-les d'abord vers&nbsp;:</p>
            <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)} style={styles.select} aria-label="Déplacer les prospects vers la colonne">
              {cols.filter((c) => c.id !== confirmDel).map((c) => (<option key={c.id} value={c.id}>{c.label}</option>))}
            </select>
            <div style={styles.dactions}>
              <button type="button" onClick={() => setConfirmDel(null)} disabled={busy} style={styles.cancel}>Annuler</button>
              <button type="button" onClick={confirmDelete} disabled={busy} style={styles.confirm}>{busy ? 'Déplacement…' : 'Déplacer & supprimer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { background: '#fff', border: `1px solid ${LINE}`, borderRadius: '14px', padding: '1.25rem', fontFamily: SANS, color: INK },
  h2: { fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.3rem' },
  help: { fontSize: '0.88rem', color: MUTED, margin: '0 0 1rem' },
  errLine: { color: DANGER, fontSize: '0.9rem' },
  list: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  row: { display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', padding: '0.5rem', background: PAPER, border: `1px solid ${LINE}`, borderRadius: '10px' },
  moves: { display: 'flex', flexDirection: 'column', gap: '2px' },
  mv: { width: 24, height: 20, border: `1px solid ${LINE}`, background: '#fff', borderRadius: '5px', cursor: 'pointer', fontSize: '0.7rem', lineHeight: 1, color: INK },
  inLabel: { flex: '1 1 140px', minWidth: 0, padding: '0.4rem 0.6rem', border: `1px solid ${LINE}`, borderRadius: '8px', fontSize: '0.9rem', fontWeight: 700, fontFamily: SANS, color: INK, boxSizing: 'border-box' },
  inHint: { flex: '1 1 140px', minWidth: 0, padding: '0.4rem 0.6rem', border: `1px solid ${LINE}`, borderRadius: '8px', fontSize: '0.85rem', fontFamily: SANS, color: MUTED, boxSizing: 'border-box' },
  colors: { display: 'flex', gap: '3px' },
  swatch: { width: 18, height: 18, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0 },
  count: { fontSize: '0.75rem', color: MUTED, minWidth: '3rem' },
  del: { width: 30, height: 30, border: '1px solid #fecaca', background: '#fff', color: DANGER, borderRadius: '8px', cursor: 'pointer', fontWeight: 800 },
  add: { marginTop: '0.75rem', padding: '0.5rem 1rem', background: '#fff', border: `1px dashed ${ACCENT}`, color: ACCENT, borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontFamily: SANS },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: `1px solid ${LINE}` },
  save: { padding: '0.55rem 1.5rem', background: ACCENT, color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 800, fontFamily: SANS },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000 },
  dialog: { background: '#fff', borderRadius: '14px', padding: '1.3rem', maxWidth: '24rem', width: '100%', boxShadow: '0 16px 44px rgba(15,23,42,0.3)' },
  dh: { fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.5rem', color: INK },
  dp: { fontSize: '0.9rem', color: MUTED, margin: '0 0 0.75rem' },
  select: { width: '100%', padding: '0.5rem', border: `1px solid ${LINE}`, borderRadius: '8px', fontFamily: SANS, fontSize: '0.9rem', marginBottom: '1rem', boxSizing: 'border-box' },
  dactions: { display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' },
  cancel: { padding: '0.5rem 1rem', background: '#fff', border: `1px solid ${LINE}`, borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: SANS, color: INK },
  confirm: { padding: '0.5rem 1rem', background: DANGER, color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 800, fontFamily: SANS },
};
