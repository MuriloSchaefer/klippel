/**
 * Catalog search scoring — the one implementation, shared by the renderer's
 * `useFilteredMaterials` and the main-process window reader.
 *
 * Search moved into main when the renderer stopped mirroring the whole
 * catalog: a query has to be answered against every material, and the
 * renderer only holds a page of them. Both sides must agree on what "matches"
 * means or the same query would narrow differently depending on whether the
 * row happened to be resident, so the scorer and the searchable-text shape
 * live here rather than being written twice.
 *
 * Pure and dependency-free — it is imported by main-process code, so it must
 * not reach for `window`, Redux, or any Jazz runtime.
 */

/**
 * Subsequence-match fuzzy score. Contiguous matches outrank scattered ones; a
 * whole-substring hit outranks both, ranked by how early it starts. `0` means
 * "no match" and is the only value callers may treat as a filter.
 *
 * **Both arguments must already be lower-cased.** Casing once per catalog
 * build, rather than per comparison, is what keeps a keystroke linear in the
 * catalog instead of linear-with-a-large-constant.
 */
export function scoreSubsequence(needle: string, haystack: string): number {
  if (!needle) return 1;
  const n = needle;
  const h = haystack;
  if (h.includes(n)) return 100 - Math.max(0, h.indexOf(n));
  let score = 0;
  let lastIdx = -1;
  let streak = 0;
  for (const ch of n) {
    const idx = h.indexOf(ch, lastIdx + 1);
    if (idx === -1) return 0;
    if (idx === lastIdx + 1) {
      streak += 1;
      score += 2 + streak;
    } else {
      streak = 0;
      score += 1;
    }
    lastIdx = idx;
  }
  return score;
}

/**
 * The display surface a query is matched against. Deliberately *not* the
 * whole material: a query matches what the user can read in the grid, so
 * adding a field here silently changes which rows a search returns.
 */
export interface SearchableParts {
  /** `attributes.nome` — the row's principal label. */
  nome?: string;
  /** `attributes.cor.label` — the colour name, not its hex. */
  corLabel?: string;
  /** The material type's human label, not its slug. */
  typeLabel?: string;
  industry?: string;
  externalId?: string;
}

/**
 * Join a material's searchable fields into the single lower-cased string the
 * scorer reads. Built once per material per catalog change and cached — it is
 * a function of the catalog, never of the query.
 */
export function buildHaystack(parts: SearchableParts): string {
  const out: string[] = [];
  if (parts.nome) out.push(String(parts.nome));
  if (parts.corLabel) out.push(String(parts.corLabel));
  if (parts.typeLabel) out.push(String(parts.typeLabel));
  if (parts.industry) out.push(String(parts.industry));
  if (parts.externalId) out.push(String(parts.externalId));
  return out.join(" ").toLowerCase();
}

/** Normalize a raw query the way both sides must, before scoring. */
export const normalizeQuery = (query: string | undefined): string =>
  (query ?? "").trim().toLowerCase();
