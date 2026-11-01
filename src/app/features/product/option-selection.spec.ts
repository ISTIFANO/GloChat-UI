import { describe, expect, it } from 'vitest';
import { OptionGroup, ProductDetail } from '../../core/api/contracts';
import { initialSelection, missingGroups, previewUnitPrice, toggle } from './option-selection';

const size: OptionGroup = {
  id: 'size', name: 'Taille', type: 'SINGLE', minSelect: 1, maxSelect: 1, required: true,
  values: [
    { id: 'm', label: 'Normal', priceDelta: 0, available: true },
    { id: 'l', label: 'Large', priceDelta: 12, available: true },
  ],
};
const extras: OptionGroup = {
  id: 'extras', name: 'Suppléments', type: 'MULTI', minSelect: 0, maxSelect: 2, required: false,
  values: [
    { id: 'bacon', label: 'Bacon', priceDelta: 10, available: true },
    { id: 'patty', label: 'Steak', priceDelta: 18, available: true },
    { id: 'jala', label: 'Jalapeños', priceDelta: 4, available: true },
    { id: 'gone', label: 'Épuisé', priceDelta: 1, available: false },
  ],
};
const sauce: OptionGroup = {
  id: 'sauce', name: 'Sauce', type: 'SINGLE', minSelect: 1, maxSelect: 1, required: true,
  values: [{ id: 'bbq', label: 'BBQ', priceDelta: 0, available: false }],
};

const detail = (groups: OptionGroup[]): ProductDetail => ({
  product: {
    productId: 'p', name: 'Double Smash', shortDescription: '', visual: { emoji: '🍔', from: '#fff', to: '#000' },
    price: 65, currency: 'MAD', merchant: { id: 'm', name: 'M', emoji: '🍔', cuisine: 'burger' }, distanceKm: 1,
    etaText: '10–20 min', deliveryFee: 11, tags: [], needsConfiguration: true, merchantOpen: true,
  },
  description: '',
  optionGroups: groups,
});

describe('option selection', () => {
  it('pre-selects the first value of required single groups', () => {
    const s = initialSelection(detail([size, extras]));
    expect([...s.get('size')!]).toEqual(['m']);
    expect(s.get('extras')!.size).toBe(0);
  });

  it('single choice replaces the value and cannot be emptied when required', () => {
    const d = detail([size]);
    let s = initialSelection(d);
    s = toggle(s, size, 'l');
    expect([...s.get('size')!]).toEqual(['l']);
    s = toggle(s, size, 'l');
    expect([...s.get('size')!]).toEqual(['l']);
  });

  it('multi choice respects maxSelect and ignores unavailable values', () => {
    const d = detail([extras]);
    let s = initialSelection(d);
    s = toggle(s, extras, 'bacon');
    s = toggle(s, extras, 'patty');
    s = toggle(s, extras, 'jala'); // over max 2 -> ignored
    s = toggle(s, extras, 'gone'); // unavailable -> ignored
    expect([...s.get('extras')!].sort()).toEqual(['bacon', 'patty']);
    s = toggle(s, extras, 'bacon');
    expect([...s.get('extras')!]).toEqual(['patty']);
  });

  it('reports required groups that cannot be satisfied', () => {
    const d = detail([sauce]);
    expect(missingGroups(d, initialSelection(d)).map((g) => g.name)).toEqual(['Sauce']);
  });

  it('previews base price plus deltas', () => {
    const d = detail([size, extras]);
    let s = initialSelection(d);
    s = toggle(s, size, 'l');
    s = toggle(s, extras, 'bacon');
    expect(previewUnitPrice(d, s)).toBe(87);
  });
});
