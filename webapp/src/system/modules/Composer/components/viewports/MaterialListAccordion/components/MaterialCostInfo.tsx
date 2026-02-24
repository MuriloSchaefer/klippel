import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { MaterialNode } from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useMaterialCostComputation } from "../hooks/useMaterialCostComputation";

export default function MaterialCostInfo({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  
  const { cost } = useMaterialCostComputation({ variationId, node, material });

  const units = useUnits(
    [material.stock?.unit, cost?.quotient.unit, cost?.dividend.unit].filter(
      Boolean
    ) as string[]
  );

  const costAbbreviation =
    cost && units && units[cost.quotient.unit]?.abbreviation;
  const dividendAbbreviation =
    cost && units && units[cost.dividend.unit]?.abbreviation;

  return cost ? (
    <>
      {cost.quotient.amount.toFixed(2)} {costAbbreviation} / {dividendAbbreviation}
    </>
  ) : (
    <>não utilizado</>
  );
}
