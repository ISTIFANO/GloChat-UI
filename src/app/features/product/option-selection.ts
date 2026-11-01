import { OptionGroup, ProductDetail } from '../../core/api/contracts';

/**
 * Client-side rules for the option picker. They only drive the UI (disable CTA, live price preview);
 * the backend re-validates and re-prices everything when the cart is updated (spec §4).
 */
export type SelectionState = ReadonlyMap<string, ReadonlySet<string>>; // groupId -> valueIds

export function initialSelection(detail: ProductDetail): SelectionState {
  const state = new Map<string, Set<string>>();
  for (const g of detail.optionGroups) {
    const set = new Set<string>();
    // pre-select the first available value of required single-choice groups
    if (g.required && g.type === 'SINGLE') {
      const first = g.values.find((v) => v.available);
      if (first) set.add(first.id);
    }
    state.set(g.id, set);
  }
  return state;
}

export function toggle(state: SelectionState, group: OptionGroup, valueId: string): SelectionState {
  const next = new Map<string, Set<string>>();
  for (const [k, v] of state) next.set(k, new Set(v));
  const current = next.get(group.id) ?? new Set<string>();
  const value = group.values.find((v) => v.id === valueId);
  if (!value || !value.available) return state;

  if (group.type === 'SINGLE') {
    const wasSelected = current.has(valueId);
    current.clear();
    if (!wasSelected || group.required) current.add(valueId); // required single: can't unselect
  } else if (current.has(valueId)) {
    current.delete(valueId);
  } else if (current.size < group.maxSelect) {
    current.add(valueId);
  }
  next.set(group.id, current);
  return next;
}

export function missingGroups(detail: ProductDetail, state: SelectionState): OptionGroup[] {
  return detail.optionGroups.filter((g) => {
    const count = state.get(g.id)?.size ?? 0;
    return count < (g.required ? Math.max(1, g.minSelect) : g.minSelect);
  });
}

export function previewUnitPrice(detail: ProductDetail, state: SelectionState): number {
  let price = detail.product.price;
  for (const g of detail.optionGroups) {
    for (const id of state.get(g.id) ?? []) {
      price += g.values.find((v) => v.id === id)?.priceDelta ?? 0;
    }
  }
  return Math.round(price * 100) / 100;
}
