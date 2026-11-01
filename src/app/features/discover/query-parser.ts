/**
 * Extracts the structured hints the search API accepts (budget, party size) from free text,
 * until the agent (Inc 7) does this with the LLM. The full text is still sent as the query.
 */
export interface ParsedQuery {
  query: string;
  maxPrice?: number;
  partySize?: number;
}

const BUDGET = /(?:<|≤|sous|moins de|max(?:imum)?|under|below|less than|budget|أقل من|اقل من)\s*(\d{1,4})/i;
const PARTY = /(?:pour|for|ل)\s*(\d{1,2})\b|(\d{1,2})\s*(?:pers(?:onnes?)?|people|persons|أشخاص)|\b(deux|two|جوج)\b/i;

export function parseQuery(text: string): ParsedQuery {
  const trimmed = text.trim();
  const result: ParsedQuery = { query: trimmed };

  const budget = BUDGET.exec(trimmed);
  if (budget) result.maxPrice = Number(budget[1]);

  const party = PARTY.exec(trimmed);
  if (party) {
    const n = party[1] ?? party[2];
    result.partySize = n ? Number(n) : 2;
  }
  return result;
}
