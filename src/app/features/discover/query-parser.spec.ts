import { describe, expect, it } from 'vitest';
import { parseQuery } from './query-parser';

describe('parseQuery', () => {
  it('keeps the full text as query', () => {
    expect(parseQuery('  un burger  ').query).toBe('un burger');
  });

  it('extracts a budget in French, English and Arabic', () => {
    expect(parseQuery('healthy sous 70').maxPrice).toBe(70);
    expect(parseQuery('pizza under 60 MAD').maxPrice).toBe(60);
    expect(parseQuery('burger < 50').maxPrice).toBe(50);
    expect(parseQuery('برغر أقل من 45').maxPrice).toBe(45);
  });

  it('extracts the number of people', () => {
    expect(parseQuery('sushi pour 2').partySize).toBe(2);
    expect(parseQuery('pizza for 4').partySize).toBe(4);
    expect(parseQuery('3 personnes tajine').partySize).toBe(3);
    expect(parseQuery('sushi pour deux').partySize).toBe(2);
  });

  it('leaves hints undefined when absent', () => {
    expect(parseQuery('tajine poulet')).toEqual({ query: 'tajine poulet' });
  });
});
