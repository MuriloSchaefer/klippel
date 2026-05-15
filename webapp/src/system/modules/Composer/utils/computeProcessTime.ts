import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type { ConversionNodes, ConvertionEdges } from "@system/modules/Converter/typings";
import type {
  ProcessNode,
  ElectiveNode,
  ProcessTimeAudit,
  AttributeNormalisationAudit,
  ConversionStepAudit,
  PlannedConversionStep,
} from "../typings";
import { traceConversion } from "../components/viewports/MaterialListAccordion/utils/traceConversion";

const DEFAULT_TARGET_QUOTIENT = "minutos249";
const DEFAULT_TARGET_DIVIDEND = "unitario18";

const QUANTITY_VARS = new Set(["quantidade", "quantidadeQuociente", "quantidadeDividendo"]);

export function computeProcessTime({
  processNodeId,
  graphState,
  conversionGraphState,
  targetQuotient = DEFAULT_TARGET_QUOTIENT,
  targetDividend = DEFAULT_TARGET_DIVIDEND,
}: {
  processNodeId: string;
  graphState: GraphState;
  conversionGraphState: GraphState<ConversionNodes, ConvertionEdges>;
  targetQuotient?: string;
  targetDividend?: string;
}): {
  time: { amount: number; unit: string } | undefined;
  audit: ProcessTimeAudit | undefined;
} {
  const processNode = graphState.nodes[processNodeId] as ProcessNode | undefined;
  if (!processNode || processNode.type !== "PROCESS") {
    return { time: undefined, audit: undefined };
  }

  if (processNode.electiveNodeId) {
    const electiveNode = graphState.nodes[processNode.electiveNodeId] as
      | ElectiveNode
      | undefined;
    if (electiveNode && electiveNode.value === false) {
      return { time: undefined, audit: undefined };
    }
  }

  const computedAt = new Date().toISOString();

  if (!processNode.costTime) {
    return {
      time: undefined,
      audit: {
        computedAt,
        processLabel: processNode.label,
        rawCostTime: undefined,
        attributeNormalisations: [],
        conversionSteps: [],
        error: "Processo sem costTime definido.",
      },
    };
  }

  const trace = traceConversion({
    from: processNode.costTime,
    to: { quotient: targetQuotient, dividend: targetDividend },
    initialParams: {},
    conversionGraph: conversionGraphState,
  });

  const attributeNormalisations: AttributeNormalisationAudit[] = (
    trace.attributeConversions ?? []
  ).map((ac) => ({
    attributeName: ac.name,
    originalValue: ac.originalValue,
    originalUnit: ac.originalUnit,
    normalisedValue: ac.convertedValue,
    normalisedUnit: ac.convertedUnit,
  }));

  const conversionSteps: ConversionStepAudit[] = (trace.steps ?? []).map((step) => {
    const attributeValues: { [k: string]: number } = {};
    const quantityValues: { [k: string]: number } = {};
    for (const [k, v] of Object.entries(step.context)) {
      if (QUANTITY_VARS.has(k)) quantityValues[k] = v;
      else attributeValues[k] = v;
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

  const plannedSteps: PlannedConversionStep[] | undefined = trace.plannedSteps?.map((p) => ({
    fromUnit: p.from,
    toUnit: p.to,
    expression: p.expression,
  }));

  const baseAudit: Omit<ProcessTimeAudit, "result" | "error"> = {
    computedAt,
    processLabel: processNode.label,
    rawCostTime: processNode.costTime,
    attributeNormalisations,
    initialContext: trace.initialContext,
    plannedSteps,
    conversionSteps,
  };

  if ("error" in trace && trace.error) {
    return {
      time: undefined,
      audit: { ...baseAudit, error: trace.error },
    };
  }

  const result = { amount: trace.finalValue as number, unit: targetQuotient };
  return {
    time: result,
    audit: { ...baseAudit, result },
  };
}
