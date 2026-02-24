import { useMemo } from "react";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IConverterModule } from "@system/modules/Converter";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type { ConversionNodes, ConvertionEdges, CompoundValue } from "@system/modules/Converter/typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { ConsumesEdge, MaterialNode, ProcessNode } from "../../../../typings";
import { CONVERSION_GRAPH_NAME } from "@system/modules/Converter/constants";
import { traceConversion } from "../utils/traceConversion";
import type { ComputationStep } from "../types";

export function useMaterialCostComputation({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const converterModule = useModule<IConverterModule>("Converter");
  const useConverter = converterModule.hooks.useConverter;
  const converter = useConverter();
  const graphModule = useModule<IGraphModule>("Graph");
  const graph = graphModule.hooks.useGraph(variationId, (g) => g);
  const conversionGraph = graphModule.hooks.useGraph(CONVERSION_GRAPH_NAME, (g) => g);

  return useMemo(() => {
    if (!material || !converter || !material.stock || !conversionGraph.state) {
      return { cost: undefined, steps: [] };
    }

    const consumesEdges = Object.values(graph.state?.edges ?? {}).filter(
      (e): e is ConsumesEdge => e.type === "CONSUMES" && e.targetId === node.id
    );
    
    let totalCost: CompoundValue = {
      quotient: { amount: 0, unit: material.stock.unit },
      dividend: { amount: 1, unit: "unitario18" },
    };
    
    const steps: ComputationStep[] = [];

    for (const edge of consumesEdges) {
      const processNode = graph.state?.nodes[edge.sourceId] as ProcessNode;
      
      // Trace detailed conversion steps
      const conversionTrace = traceConversion({
        from: edge.amount,
        to: {
          quotient: totalCost.quotient.unit,
          dividend: totalCost.dividend.unit,
        },
        initialParams: material.attributes,
        conversionGraph: conversionGraph.state as GraphState<ConversionNodes, ConvertionEdges>,
        converter,
      });
      
      if ('error' in conversionTrace) {
        // Conversion failed, but still show the process with an error
        const errorResult = conversionTrace as { error: string; normalizedFrom?: CompoundValue };
        const { error: errorMessage, normalizedFrom } = errorResult;
        const originalUnits = `${edge.amount.quotient.unit}/${edge.amount.dividend.unit}`;
        const normalizedUnits = normalizedFrom 
          ? `${normalizedFrom.quotient.unit}/${normalizedFrom.dividend.unit}`
          : originalUnits;
        const targetUnits = `${totalCost.quotient.unit}/${totalCost.dividend.unit}`;
        
        const errorMsg = normalizedUnits !== originalUnits
          ? `Origem: ${originalUnits} (normalizado para ${normalizedUnits})\nDestino: ${targetUnits}\n\nErro: ${errorMessage}`
          : `Origem: ${originalUnits}\nDestino: ${targetUnits}\n\nErro: ${errorMessage}`;
        
        steps.push({
          processLabel: processNode?.label || "Processo desconhecido",
          edgeAmount: edge.amount,
          convertedAmount: 0,
          runningTotal: totalCost.quotient.amount,
          targetUnits: {
            quotient: totalCost.quotient.unit,
            dividend: totalCost.dividend.unit,
          },
          conversionSteps: [],
          attributeConversions: normalizedFrom ? [
            {
              name: 'consumoQuociente (normalizado)',
              originalValue: edge.amount.quotient.amount,
              originalUnit: edge.amount.quotient.unit,
              convertedValue: normalizedFrom.quotient.amount,
              convertedUnit: normalizedFrom.quotient.unit,
            },
            {
              name: 'consumoDividendo (normalizado)',
              originalValue: edge.amount.dividend.amount,
              originalUnit: edge.amount.dividend.unit,
              convertedValue: normalizedFrom.dividend.amount,
              convertedUnit: normalizedFrom.dividend.unit,
            }
          ].filter(conv => conv.originalUnit !== conv.convertedUnit) : [],
          error: errorMsg,
        });
        continue;
      }
      
      // Use the finalValue from traceConversion which has proper unit conversions applied
      const convertedAmount = conversionTrace.finalValue;

      totalCost.quotient.amount += convertedAmount;
      
      steps.push({
        processLabel: processNode?.label || "Processo desconhecido",
        edgeAmount: edge.amount,
        convertedAmount: convertedAmount,
        runningTotal: totalCost.quotient.amount,
        targetUnits: {
          quotient: totalCost.quotient.unit,
          dividend: totalCost.dividend.unit,
        },
        conversionSteps: conversionTrace.steps || [],
        attributeConversions: conversionTrace.attributeConversions || [],
      });
    }

    return { cost: totalCost, steps };
  }, [variationId, node, material, graph, converter, conversionGraph]);
}
