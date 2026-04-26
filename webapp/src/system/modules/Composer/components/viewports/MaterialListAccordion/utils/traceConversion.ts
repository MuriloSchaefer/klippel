import { compile } from "jse-eval";
import { isNumber } from "lodash";
import dfs from "@kernel/modules/Graphs/searchAlgs/dfs";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type {
  CompoundValue,
  UnitValue,
  ConversionNodes,
  ConvertionEdges,
  ConvertsToEdge,
} from "@system/modules/Converter/typings";
import { convert } from "@system/modules/Converter/utils/convert";
import type { AttributeConversion, ConversionStep } from "../types";

/**
 * Traces the detailed conversion steps from one compound unit to another,
 * automatically converting material attributes to match the target unit scale.
 *
 * This function replicates the converter's logic while capturing each intermediate
 * step and tracking which material attributes were auto-converted.
 *
 * @param from - Source compound value with quotient and dividend
 * @param to - Target compound unit (quotient and dividend unit IDs)
 * @param initialParams - Material attributes that may contain compound or simple values
 * @param conversionGraph - Graph containing unit nodes and conversion edges
 * @returns Object containing conversion steps, final value, and attribute conversions, or error information if conversion fails
 */
export function traceConversion({
  from,
  to,
  initialParams,
  conversionGraph,
}: {
  from: CompoundValue;
  to: { quotient: string; dividend: string };
  initialParams: { [name: string]: number | UnitValue | CompoundValue };
  conversionGraph: GraphState<ConversionNodes, ConvertionEdges>;
}): {
  steps: ConversionStep[];
  finalValue: number;
  attributeConversions: AttributeConversion[];
  error?: never;
} | {
  error: string;
  normalizedFrom?: CompoundValue;
  steps?: never;
  finalValue?: never;
  attributeConversions?: never;
} {
  if (!conversionGraph) {
    return { error: "Grafo de conversão não disponível" };
  }

  // Helper function to get base unit for a given unit
  const getBaseUnit = (
    unitId: string
  ): { baseUnitId: string; conversionFactor: number; error?: string } | { error: string } => {
    const unitScale = Object.values(conversionGraph.edges).find((e: any) =>
      e.type === 'BELONGS_TO' && e.sourceId === unitId
    );

    // If unit doesn't belong to a scale, return it as-is (no normalization needed)
    if (!unitScale) {
      return { baseUnitId: unitId, conversionFactor: 1 };
    }

    const scaleId = (unitScale as any).targetId;
    const scaleNode = conversionGraph.nodes[scaleId];

    if (!scaleNode || scaleNode.type !== 'SCALE') {
      return { error: `Nó de escala não encontrado: ${scaleId}` };
    }

    const baseUnitId = (scaleNode as any).base;

    if (!baseUnitId) {
      return { error: `Nenhuma unidade base definida para escala ${scaleId}` };
    }

    if (unitId === baseUnitId) {
      return { baseUnitId: unitId, conversionFactor: 1 };
    }

    // Find conversion edge to base unit
    const conversionEdge = Object.values(conversionGraph.edges).find(
      (e: any) =>
        e.type === "CONVERTS_TO" &&
        e.sourceId === unitId &&
        e.targetId === baseUnitId
    ) as ConvertsToEdge | undefined;

    if (!conversionEdge) {
      return { error: `Nenhuma aresta CONVERTS_TO encontrada de ${unitId} para ${baseUnitId}` };
    }

    // Calculate conversion factor
    let factor = 1;
    if (conversionEdge.conversionType === 'factor') {
      factor = conversionEdge.factor;
    } else if (conversionEdge.conversionType === 'expression') {
      // Evaluate expression with quantidade=1 to get the factor
      try {
        const fn = compile(conversionEdge.expression);
        factor = fn({ quantidade: 1 }) as number;
      } catch (err) {
        return { error: `Erro ao avaliar expressão de conversão: ${err}` };
      }
    }

    return { baseUnitId, conversionFactor: factor };
  };

  // Normalize 'from' compound value to use base units
  let normalizedFrom = { ...from };
  const fromQuotientBase = getBaseUnit(from.quotient.unit);
  const fromDividendBase = getBaseUnit(from.dividend.unit);

  // Check for errors in base unit lookup
  if ('error' in fromQuotientBase) {
    return {
      error: `Erro ao normalizar unidade do quociente (${from.quotient.unit}): ${fromQuotientBase.error}`
    };
  }
  if ('error' in fromDividendBase) {
    return {
      error: `Erro ao normalizar unidade do dividendo (${from.dividend.unit}): ${fromDividendBase.error}`
    };
  }

  // Track conversions applied to attributes
  const attributeConversions: AttributeConversion[] = [];

  if (fromQuotientBase.baseUnitId !== from.quotient.unit) {
    normalizedFrom.quotient = {
      amount: from.quotient.amount * fromQuotientBase.conversionFactor,
      unit: fromQuotientBase.baseUnitId,
    };
    // Record normalization as a conversion
    attributeConversions.push({
      name: 'consumoQuociente (normalizado)',
      originalValue: from.quotient.amount,
      originalUnit: from.quotient.unit,
      convertedValue: normalizedFrom.quotient.amount,
      convertedUnit: fromQuotientBase.baseUnitId,
    });
  }

  if (fromDividendBase.baseUnitId !== from.dividend.unit) {
    normalizedFrom.dividend = {
      amount: from.dividend.amount * fromDividendBase.conversionFactor,
      unit: fromDividendBase.baseUnitId,
    };
    // Record normalization as a conversion
    attributeConversions.push({
      name: 'consumoDividendo (normalizado)',
      originalValue: from.dividend.amount,
      originalUnit: from.dividend.unit,
      convertedValue: normalizedFrom.dividend.amount,
      convertedUnit: fromDividendBase.baseUnitId,
    });
  }

  // Find from and to nodes using normalized units
  const fromNode = Object.values(conversionGraph.nodes ?? {}).find(
    (n: any) =>
      n.type === "COMPOUND_UNIT" &&
      n.dividendUnitId === normalizedFrom.dividend.unit &&
      n.quotientUnitId === normalizedFrom.quotient.unit
  ) as any;

  const toNode = Object.values(conversionGraph.nodes ?? {}).find(
    (n: any) =>
      n.type === "COMPOUND_UNIT" &&
      n.dividendUnitId === to.dividend &&
      n.quotientUnitId === to.quotient
  ) as any;

  if (!fromNode) {
    return {
      error: `Unidade composta não encontrada no grafo: ${normalizedFrom.quotient.unit}/${normalizedFrom.dividend.unit}`,
      normalizedFrom
    };
  }

  if (!toNode) {
    return {
      error: `Unidade composta de destino não encontrada no grafo: ${to.quotient}/${to.dividend}`,
      normalizedFrom
    };
  }

  // Prepare variable context with unit conversion
  const variablesAvailable = Object.entries(initialParams).reduce(
    (acc, [name, value]) => {
      if (isNumber(value)) {
        return { ...acc, [name]: value };
      }
      if (typeof value === "object" && "unit" in value) {
        // Single unit value - convert to base unit of its scale
        let convertedValue = value.amount;
        let targetUnit = value.unit;

        // Find which scale this unit belongs to
        const valueUnitScale = Object.values(conversionGraph.edges).find((e: any) =>
          e.type === 'BELONGS_TO' && e.sourceId === value.unit
        );

        if (valueUnitScale) {
          const scaleId = (valueUnitScale as any).targetId;
          const scaleNode = conversionGraph.nodes[scaleId];
          const baseUnit = scaleNode && scaleNode.type === 'SCALE' ? (scaleNode as any).base : undefined;

          // Convert to the base unit of this scale
          if (baseUnit && value.unit !== baseUnit) {
            try {
              const converted = convert(
                conversionGraph,
                { unit: value.unit, amount: value.amount },
                baseUnit,
                {}
              );
              if (converted && 'amount' in converted) {
                convertedValue = converted.amount;
                targetUnit = baseUnit;
                // Record the conversion
                if (Math.abs(convertedValue - value.amount) > 0.0001) {
                  attributeConversions.push({
                    name,
                    originalValue: value.amount,
                    originalUnit: value.unit,
                    convertedValue,
                    convertedUnit: baseUnit,
                  });
                }
              }
            } catch (e) {
              // Conversion failed, use original value
            }
          }
        }

        return { ...acc, [name]: convertedValue };
      }
      if (typeof value === "object" && "quotient" in value) {
        // Compound value - convert quotient to base unit of its scale
        let quotientValue = value.quotient.amount;

        // Find which scale the quotient unit belongs to
        const quotientUnitScale = Object.values(conversionGraph.edges).find((e: any) =>
          e.type === 'BELONGS_TO' && e.sourceId === value.quotient.unit
        );

        if (quotientUnitScale) {
          const scaleId = (quotientUnitScale as any).targetId;
          const scaleNode = conversionGraph.nodes[scaleId];
          const baseUnit = scaleNode && scaleNode.type === 'SCALE' ? (scaleNode as any).base : undefined;

          // Convert quotient to the base unit of its scale
          if (baseUnit && value.quotient.unit !== baseUnit) {
            // Find direct conversion edge
            const conversionEdge = Object.values(conversionGraph.edges).find(
              (e: any) =>
                e.type === "CONVERTS_TO" &&
                e.sourceId === value.quotient.unit &&
                e.targetId === baseUnit
            ) as ConvertsToEdge | undefined;

            if (conversionEdge) {
              let convertedValue = value.quotient.amount;

              if (conversionEdge.conversionType === 'factor') {
                convertedValue *= conversionEdge.factor;
              } else if (conversionEdge.conversionType === 'expression') {
                // Evaluate expression-based conversion
                const fn = compile(conversionEdge.expression);
                convertedValue = fn({ quantidade: convertedValue }) as number;
              }

              quotientValue = convertedValue;

              // Record the conversion
              if (Math.abs(quotientValue - value.quotient.amount) > 0.0001) {
                attributeConversions.push({
                  name: `${name}Quociente`,
                  originalValue: value.quotient.amount,
                  originalUnit: value.quotient.unit,
                  convertedValue: quotientValue,
                  convertedUnit: baseUnit,
                });
              }
            }
          }
        }

        return {
          ...acc,
          [`${name}Quociente`]: quotientValue,
          [`${name}Dividendo`]: value.dividend.amount,
        };
      }
      return acc;
    },
    {} as { [name: string]: number }
  );

  // Find conversion path using DFS
  const { path } = dfs(
    conversionGraph,
    fromNode.id,
    (node: any, g: any, currFindings: any, visitedNodes: any, lastNode: any) => {
      if (node.id === fromNode.id) return true;
      const transformation = Object.values(g.edges).find(
        (e: any) =>
          e.sourceId === visitedNodes.at(-2)?.id &&
          e.targetId === lastNode &&
          e.type === "CONVERTS_TO"
      ) as any;
      if (!transformation) return false;

      const expression =
        transformation.conversionType === "factor"
          ? `quantidade * ${transformation.factor}`
          : transformation.expression;

      const identifiers = [...expression.matchAll(/[a-zA-Z]\w*/g)]
        .map(([v]) => v)
        .filter(
          (v) =>
            !["quantidade", "quantidadeQuociente", "quantidadeDividendo"].includes(v)
        );

      return identifiers.every((id) => Object.keys(variablesAvailable).includes(id));
    },
    (node: any) => !toNode || node.id === toNode.id,
    (node: any, graph: any) => {
      return Object.values(graph.edges)
        .filter(
          (e: any) =>
            graph.adjacencyList[node.id].outputs.includes(e.id) &&
            e.type === "CONVERTS_TO"
        )
        .map((e: any) => e.id);
    }
  );

  if (!path || path.at(-1) !== toNode.id) {
    const missingVars = Object.values(conversionGraph.edges)
      .filter((e: any) => e.type === 'CONVERTS_TO')
      .map((e: any) => {
        if (e.conversionType === 'expression') {
          const identifiers = [...e.expression.matchAll(/[a-zA-Z]\w*/g)]
            .map(([v]) => v)
            .filter(v => !['quantidade', 'quantidadeQuociente', 'quantidadeDividendo'].includes(v));
          return identifiers.filter(id => !Object.keys(variablesAvailable).includes(id));
        }
        return [];
      })
      .flat()
      .filter((v, i, arr) => arr.indexOf(v) === i);

    const errorMsg = missingVars.length > 0
      ? `Não foi possível encontrar caminho de conversão de ${normalizedFrom.quotient.unit}/${normalizedFrom.dividend.unit} para ${to.quotient}/${to.dividend}. Variáveis ausentes: ${missingVars.join(', ')}`
      : `Não foi possível encontrar caminho de conversão de ${normalizedFrom.quotient.unit}/${normalizedFrom.dividend.unit} para ${to.quotient}/${to.dividend}. Verifique se há uma rota de conversão disponível no grafo.`;

    return { error: errorMsg, normalizedFrom };
  }

  // Walk through path and record each step
  const steps: ConversionStep[] = [];
  let currentValue = normalizedFrom.quotient.amount / normalizedFrom.dividend.amount;

  for (let i = 0; i < path.length - 1; i++) {
    const origin = path[i];
    const destination = path[i + 1];

    const transformation = Object.values(conversionGraph.edges).find(
      (e: any) =>
        e.sourceId === origin &&
        e.targetId === destination &&
        e.type === "CONVERTS_TO"
    ) as any;

    if (!transformation) continue;

    const expression =
      transformation.conversionType === "factor"
        ? `quantidade * ${transformation.factor}`
        : transformation.expression;

    const fn = compile(expression);
    const identifiers = [...expression.matchAll(/[a-zA-Z]\w*/g)]
      .map(([v]) => v)
      .filter(
        (v) =>
          !["quantidade", "quantidadeQuociente", "quantidadeDividendo"].includes(v)
      );

    const context: { [name: string]: number } = identifiers.reduce(
      (acc, curr) => {
        const param = variablesAvailable[curr];
        if (param !== undefined && isNumber(param)) {
          return { ...acc, [curr]: param };
        }
        return acc;
      },
      {}
    );

    // Add current value to context
    context["quantidade"] = currentValue;
    context["quantidadeQuociente"] = normalizedFrom.quotient.amount;
    context["quantidadeDividendo"] = normalizedFrom.dividend.amount;

    const result = fn(context) as number;

    steps.push({
      from: origin,
      to: destination,
      expression,
      context: { ...context },
      result,
    });

    currentValue = result;
  }

  return { steps, finalValue: currentValue, attributeConversions };
}
