import { useMemo } from "react";
import type { MaterialNode } from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { ComputationStep } from "../types";

export function useMaterialCostComputation({
  variationId: _variationId,
  node,
  material: _material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  return useMemo(() => {
    const cost = node.computedCost;

    const steps: ComputationStep[] = (node.costAudit?.steps ?? [])
      .filter((s) => !s.skipped)
      .map((s) => ({
        processLabel: s.processLabel,
        edgeAmount: s.originalAmount,
        convertedAmount: s.convertedAmount,
        runningTotal: s.runningTotal,
        targetUnits: {
          quotient: s.convertedUnit || (node.computedCost?.quotient.unit ?? ""),
          dividend: node.computedCost?.dividend.unit ?? "unitario18",
        },
        conversionSteps: s.conversionSteps.map((cs) => ({
          from: cs.fromUnit,
          to: cs.toUnit,
          expression: cs.expression,
          context: { ...cs.attributeValues, ...cs.quantityValues },
          result: cs.result,
        })),
        attributeConversions: s.attributeNormalisations.map((an) => ({
          name: an.attributeName,
          originalValue: an.originalValue,
          originalUnit: an.originalUnit,
          convertedValue: an.normalisedValue,
          convertedUnit: an.normalisedUnit,
        })),
        error: s.error,
      }));

    return { cost, steps };
  }, [node]);
}
