import { useMemo } from "react";
import useMaterials from "./useMaterials";
import useMaterialTypes from "./useMaterialTypes";
import type { MaterialState } from "../store/materials/state";

/**
 * Subsequence-match fuzzy scorer over a material's display surface
 * (name, type label, industry, color label, externalId). No external
 * dep. Score is a stable rough heuristic: contiguous matches outrank
 * scattered ones; an empty query returns everything unsorted.
 *
 * The component is responsible for selecting a row when the result
 * changes — this hook is pure.
 */

function scoreSubsequence(needle: string, haystack: string): number {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = haystack.toLowerCase();
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

function materialSearchKeys(
  m: MaterialState,
  typeLabel: string | undefined,
): string {
  const parts: string[] = [];
  const attrs = m.attributes as Record<string, any>;
  if (attrs?.nome) parts.push(String(attrs.nome));
  if (attrs?.cor?.label) parts.push(String(attrs.cor.label));
  if (typeLabel) parts.push(typeLabel);
  if (m.industry) parts.push(m.industry);
  if (m.externalId) parts.push(String(m.externalId));
  return parts.join(" ");
}

export default function useFilteredMaterials(query: string): MaterialState[] {
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  return useMemo(() => {
    const items = Object.values(materials ?? {});
    if (!query.trim()) return items;
    const scored = items
      .map((m) => {
        const typeLabel = materialTypes?.[m.type]?.label;
        const score = scoreSubsequence(query, materialSearchKeys(m, typeLabel));
        return { m, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((x) => x.m);
  }, [materials, materialTypes, query]);
}
