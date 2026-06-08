import { describe, it, expect } from 'vitest';
import { parseAmount, lineTotal, saleTotal, parseLines, serializeLines } from './saleHelpers';

describe('parseAmount', () => {
  it('accepte virgule et point', () => {
    expect(parseAmount('60,00')).toBe(60);
    expect(parseAmount('60.5')).toBe(60.5);
    expect(parseAmount('1 200,50')).toBe(1200.5);
  });
  it('vide/invalide → 0', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount(null)).toBe(0);
  });
  it('passe un nombre tel quel', () => {
    expect(parseAmount(42)).toBe(42);
  });
});

describe('lineTotal', () => {
  it('qté × PU', () => {
    expect(lineTotal({ label: 'x', qty: 6, unit_price: 60 })).toBe(360);
  });
});

describe('saleTotal', () => {
  it('somme des lignes, arrondi 2 décimales', () => {
    expect(saleTotal([{ label: 'a', qty: 6, unit_price: 60 }, { label: 'b', qty: 1, unit_price: 120 }])).toBe(480);
    expect(saleTotal([{ label: 'a', qty: 3, unit_price: 10.1 }])).toBe(30.3);
  });
  it('liste vide → 0', () => {
    expect(saleTotal([])).toBe(0);
  });
});

describe('parseLines / serializeLines', () => {
  it('round-trip JSON, robuste au null/invalide', () => {
    expect(parseLines(null)).toEqual([]);
    expect(parseLines('[bad')).toEqual([]);
    const l = [{ label: 'a', qty: 2, unit_price: 5 }];
    expect(parseLines(serializeLines(l))).toEqual(l);
  });
  it('serializeLines([]) → null (pas de "[]" inutile)', () => {
    expect(serializeLines([])).toBe(null);
  });
  it('serializeLines ignore les lignes sans désignation', () => {
    expect(serializeLines([{ label: '  ', qty: 1, unit_price: 1 }])).toBe(null);
  });
});
