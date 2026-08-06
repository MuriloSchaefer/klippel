import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type {
  ConsumesEdge,
  GraduationNode,
  MaterialNode,
  VariationGraphState,
} from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useMaterialCostComputation } from "../hooks/useMaterialCostComputation";
import { useMemo } from "react";

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
  const graphModule = useModule<IGraphModule>("Graph");
  const useUnits = converterModule.hooks.useUnits;
  const converter = converterModule.hooks.useConverter();

  const { cost } = useMaterialCostComputation({ variationId, node, material });
  const graph = graphModule.hooks.useGraph<VariationGraphState>(variationId);

  const totalGarments = useMemo(() => {
    if (!graph.state) return 0;
    return Object.values(graph.state.nodes)
      .filter((n): n is GraduationNode => n.type === "GRADUATION")
      .reduce((sum, g) => sum + (g.amount ?? 0), 0);
  }, [graph.state]);

  const hasGradeOverrides = useMemo(() => {
    if (!graph.state) return false;
    return Object.values(graph.state.edges).some(
      (e) =>
        e.type === "CONSUMES" &&
        e.targetId === node.id &&
        Object.keys(((e as ConsumesEdge).consumptionPerGrade ?? {})).length > 0
    );
  }, [graph.state, node.id]);

  const units = useUnits(
    [material.stock?.unit, cost?.quotient.unit, cost?.dividend.unit].filter(
      Boolean
    ) as string[]
  );

  const dividendAbbreviation =
    cost && units && units[cost.dividend.unit]?.abbreviation;

  if (!cost) return <>não utilizado</>;

  const totalUsage =
    node.computedTotal?.quotient.amount ?? cost.quotient.amount * totalGarments;

  const scaledCost = converterModule.utils.formatScaledResult(
    converter?.state,
    cost.quotient
  );
  const scaledTotal = converterModule.utils.formatScaledResult(
    converter?.state,
    { amount: totalUsage, unit: cost.quotient.unit }
  );

  // When usage is measured in a consumption unit that isn't the stock
  // unit, the figures above can't be compared to "Em estoque". Trail
  // the stock-unit equivalent so both readings are on screen.
  const stockEquivalent =
    node.computedStockEquivalentTotal ?? node.computedStockEquivalentCost;
  const scaledStockEquivalent =
    stockEquivalent &&
    converterModule.utils.formatScaledResult(
      converter?.state,
      stockEquivalent.quotient
    );

  return (
    <>
      {scaledCost.amount.toFixed(3)} {scaledCost.abbreviation} / {dividendAbbreviation}
      {hasGradeOverrides && "*"}
      {totalGarments > 0 && (
        <>
          {" · Total: "}
          {scaledTotal.amount.toFixed(3)} {scaledTotal.abbreviation} ({totalGarments}{" "}
          {dividendAbbreviation})
        </>
      )}
      {scaledStockEquivalent && (
        <span data-testid="material-cost-stock-equivalent">
          {" ≈ "}
          {scaledStockEquivalent.amount.toFixed(3)}{" "}
          {scaledStockEquivalent.abbreviation}
          {node.computedStockEquivalentTotal ? " em estoque" : " em estoque / un"}
        </span>
      )}
    </>
  );
}
