import { useMemo } from "react";
import { shallowEqual } from "react-redux";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { IConverterModule } from "@system/modules/Converter";

import {
  ElectiveNode,
  GraduationNode,
  LogoNode,
  MaterialNode,
  ProcessNode,
} from "../typings";
import {
  computeVariationUnitCost,
  VariationUnitCost,
} from "../utils/variationUnitCost";

/**
 * Cost per produced unit for a variation, aggregated over its PROCESS nodes.
 *
 * Exposed on the Composer module surface so dependents (Orders, for the cost of
 * a budget line) get the same number the Custo accordion shows, without
 * reaching into the graph themselves.
 */
export default function useVariationUnitCost(
  variationId: string | undefined,
): VariationUnitCost {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const converterModule = useModule<IConverterModule>("Converter");
  const converter = converterModule.hooks.useConverter();

  const processNodes = useAppSelector((s: any): ProcessNode[] => {
    if (!variationId) return [];
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n) => n.type === "PROCESS",
    ) as ProcessNode[];
  }, shallowEqual);

  const materialNodes = useAppSelector((s: any): MaterialNode[] => {
    if (!variationId) return [];
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n) => n.type === "MATERIAL",
    ) as MaterialNode[];
  }, shallowEqual);

  // Catalog rows carry the price; the node carries the consumption.
  const materials = useAppSelector(
    (s: any) => s.Materials?.materials ?? {},
    shallowEqual,
  );

  // Needed to gate processes whose elective is off — those are not performed,
  // so they cost nothing and take no time.
  const electives = useAppSelector((s: any): { [id: string]: ElectiveNode } => {
    if (!variationId) return {};
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return {};
    return Object.fromEntries(
      (Object.values(nodes) as any[])
        .filter((n) => n.type === "ELECTIVE")
        .map((n) => [n.id, n as ElectiveNode]),
    );
  }, shallowEqual);

  // Logos carry their own per-unit cost, written back by the computation
  // middleware's LOGO loop.
  const logoNodes = useAppSelector((s: any): LogoNode[] => {
    if (!variationId) return [];
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n) => n.type === "LOGO",
    ) as LogoNode[];
  }, shallowEqual);

  // The size curve — a budget line's quantity comes from here.
  const graduationNodes = useAppSelector((s: any): GraduationNode[] => {
    if (!variationId) return [];
    const nodes = s.Graph?.graphs?.[variationId]?.nodes;
    if (!nodes) return [];
    return (Object.values(nodes) as any[]).filter(
      (n) => n.type === "GRADUATION",
    ) as GraduationNode[];
  }, shallowEqual);

  return useMemo(
    () =>
      computeVariationUnitCost(
        processNodes,
        converter,
        materialNodes,
        materials,
        electives,
        logoNodes,
        graduationNodes,
      ),
    [
      processNodes,
      converter,
      materialNodes,
      materials,
      electives,
      logoNodes,
      graduationNodes,
    ],
  );
}
