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

  const costAbbreviation =
    cost && units && units[cost.quotient.unit]?.abbreviation;
  const dividendAbbreviation =
    cost && units && units[cost.dividend.unit]?.abbreviation;

  if (!cost) return <>não utilizado</>;

  const totalUsage =
    node.computedTotal?.quotient.amount ?? cost.quotient.amount * totalGarments;

  return (
    <>
      {cost.quotient.amount.toFixed(2)} {costAbbreviation} /{" "}
      {dividendAbbreviation}
      {hasGradeOverrides && "*"}
      {totalGarments > 0 && (
        <>
          {" · Total: "}
          {totalUsage.toFixed(2)} {costAbbreviation} ({totalGarments}{" "}
          {dividendAbbreviation})
        </>
      )}
    </>
  );
}
