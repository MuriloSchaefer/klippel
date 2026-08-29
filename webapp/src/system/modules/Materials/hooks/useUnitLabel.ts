import { useCallback } from "react";

import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";

/**
 * Render a unit the way a person writes it: `kg`, not `kilogramas6`.
 *
 * Stock and schema units are stored as **conversion-graph node ids** — that
 * is what makes a conversion possible — and an id is not a label. The
 * abbreviation lives on the unit node, so resolving it means reading the
 * conversion graph, which is bounded by how many units exist (dozens), never
 * by catalog size.
 *
 * Falls back to the id: a unit the graph does not (yet) hold is better shown
 * raw than blank, and it makes the missing node obvious rather than silent.
 */
export default function useUnitLabel(): (unitId: string | undefined) => string {
  const converterModule = useModule<IConverterModule>("Converter");
  const units = converterModule.hooks.useUnits();

  return useCallback(
    (unitId: string | undefined) => {
      if (!unitId) return "";
      const unit = units?.[unitId] as { abbreviation?: string } | undefined;
      return unit?.abbreviation || unitId;
    },
    [units],
  );
}
