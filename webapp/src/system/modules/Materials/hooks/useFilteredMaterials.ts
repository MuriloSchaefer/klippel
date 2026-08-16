import { useMemo } from "react";
import useMaterials from "./useMaterials";
import useMaterialTypes from "./useMaterialTypes";
import type { MaterialState } from "../store/materials/state";
import {
  buildHaystack,
  normalizeQuery,
  scoreSubsequence,
} from "../shared/materialSearch";

/**
 * Fuzzy-filter the materials **resident in Redux**.
 *
 * Not the stock grid's search any more. That grid mirrors a page of the
 * catalog, so a renderer-side filter would only ever search the rows already
 * on screen — it goes through `searchMaterialsCatalog`, which runs the same
 * scorer in main over every material (`useCatalogWindow`).
 *
 * What remains for this hook is the case where the resident set *is* the
 * candidate set: a picker filtering materials a model already references. The
 * scorer is shared with main (`shared/materialSearch`) so the two cannot
 * disagree about what matches.
 *
 * The component is responsible for selecting a row when the result changes —
 * this hook is pure.
 */
function materialSearchKeys(
  m: MaterialState,
  typeLabel: string | undefined,
): string {
  const attrs = m.attributes as Record<string, any>;
  return buildHaystack({
    nome: attrs?.nome,
    corLabel: attrs?.cor?.label,
    typeLabel,
    industry: m.industry,
    externalId: m.externalId,
  });
}

export default function useFilteredMaterials(query: string): MaterialState[] {
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  // The searchable text per material is a function of the catalog, not of the
  // query — build it once per catalog change instead of re-deriving (and
  // re-joining) it for every material on every keystroke.
  const index = useMemo(() => {
    const items = Object.values(materials ?? {});
    return {
      items,
      // `buildHaystack` already lower-cases — casing once per catalog change
      // rather than per comparison is the point of the index.
      haystacks: items.map((m) =>
        materialSearchKeys(m, materialTypes?.[m.type]?.label),
      ),
    };
  }, [materials, materialTypes]);

  return useMemo(() => {
    const needle = normalizeQuery(query);
    if (!needle) return index.items;
    const scored: { m: MaterialState; score: number }[] = [];
    for (let i = 0; i < index.items.length; i++) {
      const score = scoreSubsequence(needle, index.haystacks[i]);
      if (score > 0) scored.push({ m: index.items[i], score });
    }
    scored.sort((a, b) => b.score - a.score);
    return scored.map((x) => x.m);
  }, [index, query]);
}
