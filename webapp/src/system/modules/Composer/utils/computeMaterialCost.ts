import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type { ConversionNodes, ConvertionEdges, CompoundValue } from "@system/modules/Converter/typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type {
  ConsumesEdge,
  MaterialNode,
  ProcessNode,
  ElectiveNode,
  CostAudit,
  ProcessStepAudit,
  AttributeAudit,
  AttributeNormalisationAudit,
  ConversionStepAudit,
} from "../typings";
import { traceConversion } from "../components/viewports/MaterialListAccordion/utils/traceConversion";

const QUANTITY_VARS = new Set(["quantidade", "quantidadeQuociente", "quantidadeDividendo"]);

export function computeMaterialCost({
  materialNodeId,
  graphState,
  materialState,
  conversionGraphState,
}: {
  materialNodeId: string;
  graphState: GraphState;
  materialState: MaterialState;
  conversionGraphState: GraphState<ConversionNodes, ConvertionEdges>;
}): { cost: CompoundValue | undefined; audit: CostAudit | undefined } {
  if (!materialState?.stock || !conversionGraphState) {
    return { cost: undefined, audit: undefined };
  }

  const materialNode = graphState.nodes[materialNodeId] as MaterialNode;
  if (!materialNode) {
    return { cost: undefined, audit: undefined };
  }

  const consumesEdges = Object.values(graphState.edges ?? {}).filter(
    (e): e is ConsumesEdge => e.type === "CONSUMES" && e.targetId === materialNodeId
  );

  const totalCost: CompoundValue = {
    quotient: { amount: 0, unit: materialState.stock.unit },
    dividend: { amount: 1, unit: "unitario18" },
  };

  const processSteps: ProcessStepAudit[] = [];
  const normalisedAttributeNames = new Set<string>();

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

    const conversionTrace = traceConversion({
      from: edge.amount,
      to: {
        quotient: totalCost.quotient.unit,
        dividend: totalCost.dividend.unit,
      },
      initialParams: materialState.attributes ?? {},
      conversionGraph: conversionGraphState,
    });

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

    processSteps.push({
      processLabel: processNode?.label ?? "Processo desconhecido",
      skipped: false,
      originalAmount: edge.amount,
      attributeNormalisations,
      conversionSteps,
      convertedAmount,
      convertedUnit: totalCost.quotient.unit,
      runningTotal: totalCost.quotient.amount,
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

  return {
    cost: totalCost,
    audit: {
      computedAt: new Date().toISOString(),
      materialAttributes,
      steps: processSteps,
    },
  };
}
