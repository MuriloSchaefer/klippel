import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type {
  ConversionGraph,
  ConversionNodes,
  ConvertionEdges,
  CompoundValue,
} from "@system/modules/Converter/typings";
import { convert } from "@system/modules/Converter/utils/convert";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type {
  ConsumesEdge,
  GraduationNode,
  MaterialNode,
  ProcessNode,
  ElectiveNode,
  CostAudit,
  ProcessStepAudit,
  AttributeAudit,
  AttributeNormalisationAudit,
  ConversionStepAudit,
  GraduationBreakdownEntry,
} from "../typings";
import { traceConversion } from "../components/viewports/MaterialListAccordion/utils/traceConversion";
import { resolveConsumption } from "./consumptionPerGrade";

const QUANTITY_VARS = new Set(["quantidade", "quantidadeQuociente", "quantidadeDividendo"]);

/**
 * Is there any chain of CONVERTS_TO edges from `fromId` to `toId`?
 *
 * Used to look before leaping into `convert`, which logs an error and
 * throws when no path exists. The recompute runs on every graph edit, so
 * a material whose consumption unit simply cannot be expressed in its
 * stock unit would otherwise spam the console forever. Ignores whether
 * the expressions' parameters are satisfiable — `convert` still decides
 * that, and a path that exists but lacks an attribute reports a
 * meaningful error rather than a structural one.
 */
function hasConversionPath(
  conversionGraph: GraphState<ConversionNodes, ConvertionEdges>,
  fromId: string,
  toId: string,
): boolean {
  if (fromId === toId) return true;
  const edges = Object.values(conversionGraph.edges ?? {}).filter(
    (e) => e.type === "CONVERTS_TO",
  );
  const seen = new Set<string>([fromId]);
  const queue = [fromId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const edge of edges) {
      if (edge.sourceId !== current || seen.has(edge.targetId)) continue;
      if (edge.targetId === toId) return true;
      seen.add(edge.targetId);
      queue.push(edge.targetId);
    }
  }
  return false;
}

/**
 * Build a converter that re-expresses a usage figure in the material's
 * stock unit, so the audit can put usage and stock side by side.
 *
 * Two routes, in order:
 *
 * 1. **Compound → compound** (`m²/un → Kg/un`). Preferred, because the
 *    graph models most material conversions at this level — that edge
 *    carries the gramatura/rendimento expression that makes the
 *    conversion meaningful. Requires a COMPOUND_UNIT node on both sides.
 * 2. **Quotient-only** (`m → Kg`). Both sides share the same dividend
 *    (usage is always `<unit>/un`), so the conversion reduces to a plain
 *    unit conversion of the numerator.
 *
 * Route 2 is not merely a fallback — it is the *only* correct route when
 * the stock unit is itself `unitario18`, since the compound target would
 * be the degenerate `un/un`, which is not a unit anyone models and will
 * never exist in the graph. Asking for it produced the nonsense
 * "Unidade composta de destino não encontrada no grafo: unitario18/unitario18"
 * on every material stocked per-piece (linha, botão, agulha…).
 */
function convertQuotientToStockUnit({
  stockUnit,
  dividendUnit,
  attributes,
  conversionGraph,
}: {
  stockUnit: string;
  dividendUnit: string;
  attributes: { [name: string]: any };
  conversionGraph: GraphState<ConversionNodes, ConvertionEdges>;
}) {
  const degenerate = stockUnit === dividendUnit;

  return (value: CompoundValue): { value: number } | { error: string } => {
    if (!degenerate) {
      const trace = traceConversion({
        from: value,
        to: { quotient: stockUnit, dividend: dividendUnit },
        initialParams: attributes,
        conversionGraph,
      });
      if (!("error" in trace && typeof trace.error === "string")) {
        return { value: trace.finalValue };
      }
    }

    // The audit line that renders this already names both units, so the
    // structural message stays free of raw unit ids.
    const fromUnit = value.quotient.unit;
    if (!hasConversionPath(conversionGraph, fromUnit, stockUnit)) {
      return {
        error:
          "não há conversão definida entre essas unidades. Cadastre uma no grafo de conversões para comparar o consumo com o estoque.",
      };
    }

    try {
      const converted = convert(
        conversionGraph as ConversionGraph,
        { unit: fromUnit, amount: value.quotient.amount },
        stockUnit,
        attributes,
      );
      if (!converted || !("unit" in converted)) {
        return {
          error:
            "a conversão existe, mas faltam atributos no material para avaliá-la.",
        };
      }
      return { value: converted.amount };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : String(err),
      };
    }
  };
}

export function computeMaterialCost({
  materialNodeId,
  graphState,
  materialState,
  conversionGraphState,
  consumptionUnit,
}: {
  materialNodeId: string;
  graphState: GraphState;
  materialState: MaterialState;
  conversionGraphState: GraphState<ConversionNodes, ConvertionEdges>;
  /**
   * Target unit for usage math, from the material type schema's
   * `consumptionUnit`. Stock is measured in what the material is
   * bought in (kg); consumption is often expressed in something else
   * (metres per garment). Omitted/undefined falls back to the stock
   * unit, which is the behaviour that predates this parameter.
   */
  consumptionUnit?: string;
}): {
  cost: CompoundValue | undefined;
  total: CompoundValue | undefined;
  audit: CostAudit | undefined;
  stockEquivalentCost: CompoundValue | undefined;
  stockEquivalentTotal: CompoundValue | undefined;
} {
  const empty = {
    cost: undefined,
    total: undefined,
    audit: undefined,
    stockEquivalentCost: undefined,
    stockEquivalentTotal: undefined,
  };

  if (!materialState?.stock || !conversionGraphState) {
    return empty;
  }

  const materialNode = graphState.nodes[materialNodeId] as MaterialNode;
  if (!materialNode) {
    return empty;
  }

  const targetQuotientUnit = consumptionUnit || materialState.stock.unit;

  const consumesEdges = Object.values(graphState.edges ?? {}).filter(
    (e): e is ConsumesEdge => e.type === "CONSUMES" && e.targetId === materialNodeId
  );

  const graduations = Object.values(graphState.nodes ?? {})
    .filter((n): n is GraduationNode => (n as any).type === "GRADUATION")
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const totalCost: CompoundValue = {
    quotient: { amount: 0, unit: targetQuotientUnit },
    dividend: { amount: 1, unit: "unitario18" },
  };
  const totalAggregate: CompoundValue = {
    quotient: { amount: 0, unit: targetQuotientUnit },
    dividend: { amount: 1, unit: "unitario18" },
  };

  const processSteps: ProcessStepAudit[] = [];
  const normalisedAttributeNames = new Set<string>();

  const convertOnce = (amount: CompoundValue) =>
    traceConversion({
      from: amount,
      to: {
        quotient: totalCost.quotient.unit,
        dividend: totalCost.dividend.unit,
      },
      initialParams: materialState.attributes ?? {},
      conversionGraph: conversionGraphState,
    });

  for (const edge of consumesEdges) {
    const processNode = graphState.nodes[edge.sourceId] as ProcessNode;

    if (processNode?.electiveNodeId) {
      const electiveNode = graphState.nodes[processNode.electiveNodeId] as ElectiveNode;
      if (!electiveNode?.value) {
        processSteps.push({
          processLabel: processNode?.label ?? "Processo desconhecido",
          skipped: true,
          skipReason: "Elective disabled",
          originalAmount: edge.amount,
          attributeNormalisations: [],
          conversionSteps: [],
          convertedAmount: 0,
          convertedUnit: totalCost.quotient.unit,
          runningTotal: totalCost.quotient.amount,
        });
        continue;
      }
    }

    const conversionTrace = convertOnce(edge.amount);

    if ("error" in conversionTrace && typeof conversionTrace.error === "string") {
      const errorMessage = conversionTrace.error;
      const normalizedFrom = (conversionTrace as any).normalizedFrom as CompoundValue | undefined;
      const originalUnits = `${edge.amount.quotient.unit}/${edge.amount.dividend.unit}`;
      const normalizedUnits = normalizedFrom
        ? `${normalizedFrom.quotient.unit}/${normalizedFrom.dividend.unit}`
        : originalUnits;
      const targetUnits = `${totalCost.quotient.unit}/${totalCost.dividend.unit}`;
      const errorMsg =
        normalizedUnits !== originalUnits
          ? `Origem: ${originalUnits} (normalizado para ${normalizedUnits})\nDestino: ${targetUnits}\n\nErro: ${errorMessage}`
          : `Origem: ${originalUnits}\nDestino: ${targetUnits}\n\nErro: ${errorMessage}`;

      const attributeNormalisations: AttributeNormalisationAudit[] = normalizedFrom
        ? [
            ...(normalizedFrom.quotient.unit !== edge.amount.quotient.unit
              ? [
                  {
                    attributeName: "consumoQuociente",
                    originalValue: edge.amount.quotient.amount,
                    originalUnit: edge.amount.quotient.unit,
                    normalisedValue: normalizedFrom.quotient.amount,
                    normalisedUnit: normalizedFrom.quotient.unit,
                  },
                ]
              : []),
            ...(normalizedFrom.dividend.unit !== edge.amount.dividend.unit
              ? [
                  {
                    attributeName: "consumoDividendo",
                    originalValue: edge.amount.dividend.amount,
                    originalUnit: edge.amount.dividend.unit,
                    normalisedValue: normalizedFrom.dividend.amount,
                    normalisedUnit: normalizedFrom.dividend.unit,
                  },
                ]
              : []),
          ]
        : [];

      processSteps.push({
        processLabel: processNode?.label ?? "Processo desconhecido",
        skipped: false,
        originalAmount: edge.amount,
        attributeNormalisations,
        conversionSteps: [],
        convertedAmount: 0,
        convertedUnit: totalCost.quotient.unit,
        runningTotal: totalCost.quotient.amount,
        error: errorMsg,
      });
      continue;
    }

    const convertedAmount = conversionTrace.finalValue;
    totalCost.quotient.amount += convertedAmount;

    const attributeNormalisations: AttributeNormalisationAudit[] = (
      conversionTrace.attributeConversions ?? []
    ).map((ac) => ({
      attributeName: ac.name,
      originalValue: ac.originalValue,
      originalUnit: ac.originalUnit,
      normalisedValue: ac.convertedValue,
      normalisedUnit: ac.convertedUnit,
    }));

    attributeNormalisations.forEach((an) => normalisedAttributeNames.add(an.attributeName));

    const conversionSteps: ConversionStepAudit[] = (conversionTrace.steps ?? []).map((step) => {
      const attributeValues: { [k: string]: number } = {};
      const quantityValues: { [k: string]: number } = {};
      for (const [k, v] of Object.entries(step.context)) {
        if (QUANTITY_VARS.has(k)) {
          quantityValues[k] = v;
        } else {
          attributeValues[k] = v;
        }
      }
      return {
        fromUnit: step.from,
        toUnit: step.to,
        expression: step.expression,
        attributeValues,
        quantityValues,
        result: step.result,
      };
    });

    let graduationBreakdown: GraduationBreakdownEntry[] | undefined;
    if (graduations.length > 0) {
      graduationBreakdown = [];
      for (const g of graduations) {
        const consumption = resolveConsumption(edge, g.id);
        const garmentAmount = g.amount ?? 0;
        const isOverride = !!edge.consumptionPerGrade?.[g.id];
        let convertedForG = convertedAmount;
        if (isOverride) {
          const t = convertOnce(consumption);
          if (!("error" in t)) convertedForG = t.finalValue;
          else convertedForG = 0;
        }
        const contribution = garmentAmount * convertedForG;
        totalAggregate.quotient.amount += contribution;
        graduationBreakdown.push({
          graduationId: g.id,
          graduationLabel: g.label,
          garmentAmount,
          consumption,
          gradeDelta: edge.gradeDeltas?.[g.id],
          convertedAmount: convertedForG,
          contribution,
        });
      }
    }

    processSteps.push({
      processLabel: processNode?.label ?? "Processo desconhecido",
      skipped: false,
      originalAmount: edge.amount,
      attributeNormalisations,
      conversionSteps,
      convertedAmount,
      convertedUnit: totalCost.quotient.unit,
      runningTotal: totalCost.quotient.amount,
      graduationBreakdown,
    });
  }

  const materialAttributes: AttributeAudit[] = Object.entries(
    materialState.attributes ?? {}
  ).map(([name, rawValue]) => {
    const wasNormalised =
      normalisedAttributeNames.has(name) ||
      normalisedAttributeNames.has(`${name}Quociente`);

    if (typeof rawValue === "object" && rawValue !== null && "quotient" in rawValue) {
      const v = rawValue as CompoundValue;
      return {
        name,
        rawValue,
        wasNormalised,
        injectedVariables: {
          [`${name}Quociente`]: v.quotient.amount,
          [`${name}Dividendo`]: v.dividend.amount,
        },
      };
    }

    if (typeof rawValue === "object" && rawValue !== null && "unit" in rawValue) {
      const v = rawValue as { unit: string; amount: number };
      return {
        name,
        rawValue,
        rawUnit: v.unit,
        wasNormalised,
      };
    }

    return { name, rawValue, wasNormalised: false };
  });

  // Usage now lands in the consumption unit, but stock is still held in
  // the stock unit — so "Em estoque: 40 kg" next to "Total: 320 m" would
  // be two numbers the user can't compare. Convert the finished
  // aggregates back into the stock unit for those comparison reads.
  // This runs once per material (not per edge, not per graduation), and
  // only when the two units actually differ. A failure here must never
  // blank out the primary result — it degrades to "no equivalent shown"
  // and the reason is recorded in the audit.
  const total = graduations.length > 0 ? totalAggregate : undefined;
  let stockEquivalentCost: CompoundValue | undefined;
  let stockEquivalentTotal: CompoundValue | undefined;
  let stockEquivalentAudit: CostAudit["stockEquivalent"];

  if (targetQuotientUnit !== materialState.stock.unit) {
    const stockUnit = materialState.stock.unit;
    const toStock = convertQuotientToStockUnit({
      stockUnit,
      dividendUnit: totalCost.dividend.unit,
      attributes: materialState.attributes ?? {},
      conversionGraph: conversionGraphState,
    });

    const costResult = toStock(totalCost);
    if ("error" in costResult) {
      stockEquivalentAudit = { unit: stockUnit, cost: 0, error: costResult.error };
    } else {
      stockEquivalentCost = {
        quotient: { amount: costResult.value, unit: stockUnit },
        dividend: { amount: 1, unit: totalCost.dividend.unit },
      };
      stockEquivalentAudit = { unit: stockUnit, cost: costResult.value };

      if (total) {
        const totalResult = toStock(total);
        if (!("error" in totalResult)) {
          stockEquivalentTotal = {
            quotient: { amount: totalResult.value, unit: stockUnit },
            dividend: { amount: 1, unit: total.dividend.unit },
          };
          stockEquivalentAudit.total = totalResult.value;
        }
      }
    }
  }

  return {
    cost: totalCost,
    total,
    audit: {
      computedAt: new Date().toISOString(),
      materialAttributes,
      steps: processSteps,
      targetUnit: targetQuotientUnit,
      stockEquivalent: stockEquivalentAudit,
    },
    stockEquivalentCost,
    stockEquivalentTotal,
  };
}
