import { describe, it, expect } from 'vitest';
import { DEFAULT_FIELDS, defaultSettings, mergeSettings, genColumnId, isFieldOn } from './crmSettings';

const COLS = [
  { status: 'nouveau', label: 'Nouveau', hint: 'À traiter', dot: '#94a3b8' },
  { status: 'gagne', label: 'Gagné', hint: 'Conclu', dot: '#16a34a' },
];

describe('defaultSettings', () => {
  it('mappe les colonnes config (status→id, dot→color) et active tous les champs sauf siret/orderRef', () => {
    const s = defaultSettings(COLS);
    expect(s.columns).toEqual([
      { id: 'nouveau', label: 'Nouveau', hint: 'À traiter', color: '#94a3b8' },
      { id: 'gagne', label: 'Gagné', hint: 'Conclu', color: '#16a34a' },
    ]);
    expect(s.fields.phone).toBe(true);
    expect(s.fields.siret).toBe(false);
    expect(s.fields.orderRef).toBe(false);
    expect(s.fields.billing).toBe(true);
  });
});

describe('mergeSettings', () => {
  it('renvoie les défauts si stored est null', () => {
    expect(mergeSettings(COLS, null).columns.length).toBe(2);
  });
  it('complète les champs manquants du stored par les défauts', () => {
    const m = mergeSettings(COLS, { columns: [{ id: 'x', label: 'X', hint: '', color: '#000' }], fields: { phone: false } } as any);
    expect(m.columns).toEqual([{ id: 'x', label: 'X', hint: '', color: '#000' }]);
    expect(m.fields.phone).toBe(false);
    expect(m.fields.email).toBe(true);
  });
  it('ignore un stored sans colonnes valides (fallback défauts)', () => {
    expect(mergeSettings(COLS, { columns: [], fields: {} } as any).columns.length).toBe(2);
  });
});

describe('genColumnId', () => {
  it('slugifie le libellé', () => {
    expect(genColumnId('RDV / échange', [])).toBe('rdv-echange');
  });
  it('évite les collisions', () => {
    expect(genColumnId('Nouveau', ['nouveau'])).toBe('nouveau-2');
    expect(genColumnId('Nouveau', ['nouveau', 'nouveau-2'])).toBe('nouveau-3');
  });
  it('fallback si libellé vide', () => {
    expect(genColumnId('', ['col'])).toBe('col-2');
  });
});

describe('isFieldOn', () => {
  it('vrai par défaut pour une clé absente', () => {
    expect(isFieldOn({ columns: [], fields: {} } as any, 'phone')).toBe(true);
  });
  it('respecte false', () => {
    expect(isFieldOn({ columns: [], fields: { phone: false } } as any, 'phone')).toBe(false);
  });
});
