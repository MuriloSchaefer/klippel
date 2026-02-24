import {
  useTheme,
  List,
  ListItem,
  Typography,
  Box,
  IconButton,
  Divider,
} from "@mui/material";
import AddMaterialButton from "./AddMaterialButton";
import Tooltip from "@mui/material/Tooltip";
import type { ConsumesEdge, MaterialNode, ProcessNode } from "../../../typings";
import type { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import { IConverterModule } from "@system/modules/Converter";
import type { Color } from "@system/modules/Materials/typings";
import {
  CancelSharp,
  DeleteOutlineSharp,
  ModeEditOutlineSharp,
  SaveSharp,
  FactCheckOutlined,
} from "@mui/icons-material";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useMemo, useState } from "react";
import useVariation from "../../../hooks/useVariation";
import { 
  CompoundValue, 
  UnitValue, 
  ConversionNodes, 
  ConvertionEdges, 
  ConvertsToEdge 
} from "@system/modules/Converter/typings";
import type { Converter } from "@system/modules/Converter/hooks/useConverter";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import { ErrorBoundary } from "react-error-boundary";
import { fallbackRender, fallbackRenderLabelOnly } from "@kernel/App";
import { IPointerModule } from "@kernel/modules/Pointer";
import { CONVERSION_GRAPH_NAME } from "@system/modules/Converter/constants";
import dfs from "@kernel/modules/Graphs/searchAlgs/dfs";
import { compile } from "jse-eval";
import { isNumber } from "lodash";

function ShowMaterial({
  label,
  materialLabel,
  extra,
  color,
  stock,
  onEdit,
  onDelete,
  variationId,
  node,
  material,
}: {
  label: string;
  materialLabel: string;
  extra: any;
  color?: Color;
  stock?: { amount: number; unit: string };
  onEdit: () => void;
  onDelete: () => void;
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
  const converterModule = useModule<IConverterModule>("Converter");
  const pointerModule = useModule<IPointerModule>("Pointer");
  const useConverter = converterModule.hooks.useConverter;
  const useUnits = converterModule.hooks.useUnits;
  const graphModule = useModule<IGraphModule>("Graph");
  
  const { PointerContainer } = pointerModule.components;

  const units = useUnits([material.stock?.unit].filter(Boolean) as string[]);

  const abbreviation = stock && units?.[stock.unit]?.abbreviation;

  return (
    <>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}
      >
        <Typography sx={{ fontWeight: 500, mr: 1 }} variant="body2">
          {label}
        </Typography>
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "row" }}>
          <Typography sx={{ fontWeight: 500, mr: 1 }}>
            {materialLabel}
          </Typography>
          <Typography color={theme.palette.text.secondary} sx={{ ml: 1 }}>
            (
            {typeof extra === "object" && "label" in extra
              ? extra.label
              : extra}
            )
          </Typography>
          {color ? (
            <Tooltip title={color.label} arrow>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: color.hex,
                  border: `1px solid ${theme.palette.divider}`,
                  marginLeft: 8,
                }}
              />
            </Tooltip>
          ) : null}
        </Box>
        {stock && (
          <Typography
            variant="caption"
            color={theme.palette.text.secondary}
            sx={{ ml: 0.5 }}
          >
            Em estoque: {stock.amount} {abbreviation || stock.unit}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography
            variant="caption"
            color={theme.palette.text.secondary}
            sx={{ ml: 0.5 }}
          >
            Custo por unidade:{" "}
            {
              <ErrorBoundary fallbackRender={fallbackRenderLabelOnly}>
                <MaterialCostInfo
                  variationId={variationId}
                  node={node}
                  material={material}
                />
              </ErrorBoundary>
            }
          </Typography>
          <PointerContainer
            component={
              <MaterialCostAuditContent
                variationId={variationId}
                node={node}
                material={material}
              />
            }
            actions={[]}
          >
            <Tooltip title="Ver detalhes da computação" arrow>
              <IconButton
                size="small"
                sx={{
                  padding: 0.25,
                  "&:hover": { color: theme.palette.primary.main },
                }}
              >
                <FactCheckOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </PointerContainer>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.error.light },
          }}
          onClick={onDelete}
        >
          <DeleteOutlineSharp color="error" />
        </IconButton>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.primary.main },
          }}
          onClick={onEdit}
        >
          <ModeEditOutlineSharp color="info" />
        </IconButton>
      </Box>
    </>
  );
}

function EditMaterial({
  type,
  typeRestrictions,
  materialId,
  onSave,
  onCancel,
}: Readonly<{
  type: string;
  typeRestrictions: string[];
  materialId: number;
  onSave: (materialId: number) => void;
  onCancel: () => void;
}>) {
  const theme = useTheme();
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const { MaterialSelector, MaterialTypeSelector } = materialsModule.components;

  const [form, setForm] = useState<{
    type: string;
    materialId: number | undefined;
  }>({ materialId, type });
  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <MaterialTypeSelector
            value={form.type}
            filter={(type) => {
              return typeRestrictions.includes(type.name);
            }}
            onChange={(e) =>
              setForm((curr) => ({
                ...curr,
                type: e.target.value,
                materialId: undefined,
              }))
            }
          />
          <MaterialSelector
            type={form.type}
            value={form.materialId}
            onChange={(newId) =>
              setForm((curr) => ({ ...curr, materialId: newId }))
            }
          />
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.success.main },
          }}
          onClick={() => {
            if (!form.materialId) {
              throw Error("must select a material");
            }
            onSave(form.materialId);
          }}
        >
          <SaveSharp />
        </IconButton>
        <IconButton
          onClick={onCancel}
          sx={{
            "&:hover": { color: theme.palette.error.main },
          }}
        >
          <CancelSharp />
        </IconButton>
      </Box>
    </>
  );
}

/**
 * Represents a unit conversion applied to a material attribute
 */
type AttributeConversion = {
  name: string;
  originalValue: number;
  originalUnit: string;
  convertedValue: number;
  convertedUnit: string;
};

type ConversionStep = {
  from: string;
  to: string;
  expression: string;
  context: { [key: string]: number };
  result: number;
};

type ComputationStep = {
  processLabel: string;
  edgeAmount: CompoundValue;
  convertedAmount: number;
  runningTotal: number;
  targetUnits: {
    quotient: string;
    dividend: string;
  };
  conversionSteps: ConversionStep[];
  attributeConversions: AttributeConversion[];
};

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
 * @param converter - Converter instance for unit conversions
 * @returns Object containing conversion steps, final value, and attribute conversions, or undefined if conversion is not possible
 */
function traceConversion({
  from,
  to,
  initialParams,
  conversionGraph,
  converter,
}: {
  from: CompoundValue;
  to: { quotient: string; dividend: string };
  initialParams: { [name: string]: number | UnitValue | CompoundValue };
  conversionGraph: GraphState<ConversionNodes, ConvertionEdges>;
  converter: Converter;
}): { 
  steps: ConversionStep[]; 
  finalValue: number;
  attributeConversions: AttributeConversion[];
} | undefined {
  if (!conversionGraph || !converter) return undefined;

  // Find from and to nodes
  const fromNode = Object.values(conversionGraph.nodes ?? {}).find(
    (n: any) =>
      n.type === "COMPOUND_UNIT" &&
      n.dividendUnitId === from.dividend.unit &&
      n.quotientUnitId === from.quotient.unit
  ) as any;

  const toNode = Object.values(conversionGraph.nodes ?? {}).find(
    (n: any) =>
      n.type === "COMPOUND_UNIT" &&
      n.dividendUnitId === to.dividend &&
      n.quotientUnitId === to.quotient
  ) as any;

  if (!fromNode || !toNode) return undefined;

  // Determine target scale/unit type by looking at the destination compound unit
  const toQuotientNode = conversionGraph.nodes[to.quotient];
  const toQuotientScale = toQuotientNode ? 
    Object.values(conversionGraph.edges).find((e: any) => 
      e.type === 'BELONGS_TO' && e.sourceId === to.quotient
    ) : null;
  const targetScaleId = (toQuotientScale as any)?.targetId;

  // Track conversions applied to attributes
  const attributeConversions: AttributeConversion[] = [];

  // Prepare variable context with unit conversion
  const variablesAvailable = Object.entries(initialParams).reduce(
    (acc, [name, value]) => {
      if (isNumber(value)) {
        return { ...acc, [name]: value };
      }
      if (typeof value === "object" && "unit" in value) {
        // Single unit value - try to convert to target scale's canonical unit
        let convertedValue = value.amount;
        
        // Determine if this unit belongs to the target scale
        if (targetScaleId) {
          const valueUnitScale = Object.values(conversionGraph.edges).find((e: any) => 
            e.type === 'BELONGS_TO' && e.sourceId === value.unit
          );
          
          // If both belong to the same scale, convert to the target unit
          if (valueUnitScale && (valueUnitScale as any).targetId === targetScaleId) {
            try {
              const converted = converter.convert(
                { unit: value.unit, amount: value.amount },
                to.quotient,
                {}
              );
              if (converted && 'amount' in converted) {
                convertedValue = converted.amount;
                // Record the conversion
                if (convertedValue !== value.amount) {
                  attributeConversions.push({
                    name,
                    originalValue: value.amount,
                    originalUnit: value.unit,
                    convertedValue,
                    convertedUnit: to.quotient,
                  });
                }
              }
            } catch (e) {
              console.warn(`Could not convert ${name} from ${value.unit} to ${to.quotient}:`, e);
            }
          }
        }
        
        return { ...acc, [name]: convertedValue };
      }
      if (typeof value === "object" && "quotient" in value) {
        // Compound value - check if quotient unit needs conversion
        let quotientValue = value.quotient.amount;
        
        if (targetScaleId && value.quotient.unit !== to.quotient) {
          const quotientUnitScale = Object.values(conversionGraph.edges).find((e: any) => 
            e.type === 'BELONGS_TO' && e.sourceId === value.quotient.unit
          );
          
          // If quotient unit belongs to the same scale as target, convert it
          if (quotientUnitScale && (quotientUnitScale as any).targetId === targetScaleId) {
            // Find direct conversion edge
            const conversionEdge = Object.values(conversionGraph.edges).find(
              (e: any) =>
                e.type === "CONVERTS_TO" &&
                e.sourceId === value.quotient.unit &&
                e.targetId === to.quotient
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
                  convertedUnit: to.quotient,
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

  if (!path || path.at(-1) !== toNode.id) return undefined;

  // Walk through path and record each step
  const steps: ConversionStep[] = [];
  let currentValue = from.quotient.amount / from.dividend.amount;

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
    context["quantidadeQuociente"] = from.quotient.amount;
    context["quantidadeDividendo"] = from.dividend.amount;

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

function useMaterialCostComputation({
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
      
      if (!conversionTrace) continue;
      
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

function MaterialCostInfo({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
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

function MaterialCostAuditContent({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  
  const { cost, steps } = useMaterialCostComputation({ variationId, node, material });

  // Collect all unit IDs that need to be fetched
  const allUnitIds = useMemo(() => {
    const ids = new Set<string>();
    if (material.stock?.unit) ids.add(material.stock.unit);
    if (cost?.quotient.unit) ids.add(cost.quotient.unit);
    if (cost?.dividend.unit) ids.add(cost.dividend.unit);
    
    // Add units from material attributes
    if (material.attributes) {
      Object.values(material.attributes).forEach((value: any) => {
        if (typeof value === 'object' && value !== null) {
          if ('quotient' in value && 'dividend' in value) {
            if (value.quotient?.unit) ids.add(value.quotient.unit);
            if (value.dividend?.unit) ids.add(value.dividend.unit);
          } else if ('unit' in value) {
            ids.add(value.unit);
          }
        }
      });
    }
    
    steps.forEach(step => {
      if (step.edgeAmount.quotient.unit) ids.add(step.edgeAmount.quotient.unit);
      if (step.edgeAmount.dividend.unit) ids.add(step.edgeAmount.dividend.unit);
      if (step.targetUnits.quotient) ids.add(step.targetUnits.quotient);
      if (step.targetUnits.dividend) ids.add(step.targetUnits.dividend);
      // Add units from conversion steps
      step.conversionSteps.forEach(convStep => {
        ids.add(convStep.from);
        ids.add(convStep.to);
      });
      // Add units from attribute conversions
      step.attributeConversions?.forEach(attrConv => {
        ids.add(attrConv.originalUnit);
        ids.add(attrConv.convertedUnit);
      });
    });
    return Array.from(ids);
  }, [material.stock?.unit, material.attributes, cost, steps]);

  const units = useUnits(allUnitIds);

  const stockAbbreviation = material.stock && units?.[material.stock.unit]?.abbreviation;
  const costAbbreviation = cost && units?.[cost.quotient.unit]?.abbreviation;
  const dividendAbbreviation = cost && units?.[cost.dividend.unit]?.abbreviation;

  return (
    <Box 
      sx={{ 
        minWidth: 400, 
        maxWidth: 600, 
        maxHeight: '70vh', 
        overflowY: 'auto',
        userSelect: 'text',
        cursor: 'text',
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Auditoria de Custo - {node.label}
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2 }}>
        Material: {material.stock && (
          <>
            {material.stock.amount} {stockAbbreviation || material.stock.unit}
          </>
        )}
      </Typography>

      {/* Material Attributes Section */}
      {material.attributes && Object.keys(material.attributes).length > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: theme.palette.info.main + "10", borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Atributos do Material (Variáveis de Contexto):
          </Typography>
          {Object.entries(material.attributes).map(([key, value]) => {
            // Check if this attribute was converted in any step
            const wasConverted = steps.some(step => 
              step.attributeConversions?.some(conv => 
                conv.name === key || conv.name === `${key}Quociente`
              )
            );
            
            // Handle compound values - they get expanded into Quociente/Dividendo
            if (typeof value === 'object' && value !== null && 'quotient' in value && 'dividend' in value) {
              const quotientUnit = units?.[value.quotient.unit]?.abbreviation || value.quotient.unit;
              const dividendUnit = units?.[value.dividend.unit]?.abbreviation || value.dividend.unit;
              return (
                <Box key={key} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontWeight: 500 }}>
                    {key}: {value.quotient.amount} {quotientUnit} / {dividendUnit}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.text.secondary }}>
                    → <strong>{key}Quociente</strong> = {value.quotient.amount} (usado nas expressões)
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.text.secondary }}>
                    → <strong>{key}Dividendo</strong> = {value.dividend.amount} (usado nas expressões)
                  </Typography>
                  {wasConverted && (
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.warning.main, fontSize: '0.65rem' }}>
                      ⚠ O quociente desta variável será convertido automaticamente para a unidade de destino nas expressões
                    </Typography>
                  )}
                </Box>
              );
            } else if (typeof value === 'object' && value !== null && 'amount' in value && 'unit' in value) {
              const unitAbbr = units?.[value.unit]?.abbreviation || value.unit;
              return (
                <Box key={key} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                    <strong>{key}</strong> = {value.amount} {unitAbbr}
                  </Typography>
                  {wasConverted && (
                    <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', ml: 2, color: theme.palette.warning.main, fontSize: '0.65rem' }}>
                      ⚠ Esta variável será convertida automaticamente para a unidade de destino nas expressões
                    </Typography>
                  )}
                </Box>
              );
            } else {
              return (
                <Typography key={key} variant="caption" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  <strong>{key}</strong> = {String(value)}
                </Typography>
              );
            }
          })}
        </Box>
      )}
      
      {steps.length === 0 ? (
        <Typography color={theme.palette.text.secondary}>
          Nenhum processo consome este material
        </Typography>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Passos de Computação:
          </Typography>
          {steps.map((step, index) => {
            const edgeQuotientAbbr = units?.[step.edgeAmount.quotient.unit]?.abbreviation;
            const edgeDividendAbbr = units?.[step.edgeAmount.dividend.unit]?.abbreviation;
            const targetQuotientAbbr = units?.[step.targetUnits.quotient]?.abbreviation;
            const targetDividendAbbr = units?.[step.targetUnits.dividend]?.abbreviation;
            return (
              <Box key={index} sx={{ mb: 2, p: 2, bgcolor: theme.palette.background.default, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                  Passo {index + 1}: {step.processLabel}
                </Typography>
                <Typography variant="caption" color={theme.palette.text.secondary}>
                  Consumo original: {step.edgeAmount.quotient.amount.toFixed(2)}{" "}
                  {edgeQuotientAbbr} / {edgeDividendAbbr}
                </Typography>
                
                {/* Attribute conversions - show if any attributes were auto-converted */}
                {step.attributeConversions && step.attributeConversions.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2, pl: 2, borderLeft: `2px solid ${theme.palette.warning.main}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontStyle: 'italic', display: 'block', mb: 0.5, color: theme.palette.warning.main }}>
                      ⚠ Conversões Automáticas de Atributos:
                    </Typography>
                    {step.attributeConversions.map((attrConv, attrIndex) => {
                      const originalAbbr = units?.[attrConv.originalUnit]?.abbreviation || attrConv.originalUnit;
                      const convertedAbbr = units?.[attrConv.convertedUnit]?.abbreviation || attrConv.convertedUnit;
                      return (
                        <Box key={attrIndex} sx={{ mb: 0.5, p: 1, bgcolor: theme.palette.warning.main + "10", borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            <strong>{attrConv.name}</strong>: {attrConv.originalValue} {originalAbbr} → {attrConv.convertedValue.toFixed(4)} {convertedAbbr}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
                {/* Detailed conversion steps */}
                {step.conversionSteps.length > 0 && (
                  <Box sx={{ mt: 1, ml: 2, pl: 2, borderLeft: `2px solid ${theme.palette.divider}` }}>
                    <Typography variant="caption" sx={{ fontWeight: 500, fontStyle: 'italic', display: 'block', mb: 0.5 }}>
                      Passos de Conversão:
                    </Typography>
                    {step.conversionSteps.map((convStep, convIndex) => {
                      const fromAbbr = units?.[convStep.from]?.abbreviation || convStep.from;
                      const toAbbr = units?.[convStep.to]?.abbreviation || convStep.to;
                      
                      // Separate material attributes from computed values
                      const materialVars: string[] = [];
                      const computedVars: string[] = [];
                      
                      Object.entries(convStep.context).forEach(([key, value]) => {
                        const formattedValue = typeof value === 'number' ? value.toFixed(2) : value;
                        const varStr = `${key}=${formattedValue}`;
                        
                        if (['quantidade', 'quantidadeQuociente', 'quantidadeDividendo'].includes(key)) {
                          computedVars.push(varStr);
                        } else {
                          materialVars.push(varStr);
                        }
                      });
                      
                      return (
                        <Box key={convIndex} sx={{ mb: 1, p: 1, bgcolor: theme.palette.background.paper, borderRadius: 0.5 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 500 }}>
                            {convIndex + 1}. {fromAbbr} → {toAbbr}
                          </Typography>
                          <Typography variant="caption" sx={{ display: 'block', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                            Expressão: {convStep.expression}
                          </Typography>
                          {materialVars.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block', color: theme.palette.info.main }}>
                              <strong>Atributos do material:</strong> {materialVars.join(', ')}
                            </Typography>
                          )}
                          {computedVars.length > 0 && (
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              <strong>Valores calculados:</strong> {computedVars.join(', ')}
                            </Typography>
                          )}
                          <Typography variant="caption" sx={{ display: 'block', color: theme.palette.success.main, fontWeight: 500 }}>
                            Resultado: {convStep.result.toFixed(4)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
                <br />
                <Typography variant="caption" color={theme.palette.text.secondary}>
                  Convertido para: {step.convertedAmount.toFixed(2)} {costAbbreviation}
                </Typography>
                <br />
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  Total acumulado: {step.runningTotal.toFixed(2)} {costAbbreviation} / {dividendAbbreviation}
                </Typography>
              </Box>
            );
          })}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ p: 2, bgcolor: theme.palette.primary.main + "15", borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Soma Total de Uso do Material:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
              {cost?.quotient.amount.toFixed(2)} {costAbbreviation} / {dividendAbbreviation}
            </Typography>
          </Box>
        </>
      )}
    </Box>
  );
}

function MaterialItem({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const materialTypes = materialsModule.hooks.useMaterialTypes();
  const variation = useVariation({ variationId });
  const [isEditing, setIsEditing] = useState(false);

  // Find material type and schema
  const materialType = materialTypes[material?.type];
  const schema = materialType?.schemas?.[material?.schemaVersion];
  const label = material?.attributes[schema.selector.principal];
  const extra = schema.selector.extra
    ? material?.attributes[schema.selector.extra]
    : null;
  // Find color attribute name in schema
  let colors = Object.entries(schema?.attributes ?? {}).find(
    ([attrName, attrDef]) => attrDef === "color"
  );
  const color: Color | undefined = colors
    ? material?.attributes[colors[0]]
    : undefined;

  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <ListItem
        key={node.id}
        id={node.id}
        sx={{
          mb: 0.5,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          p: 1,
        }}
      >
        {!isEditing ? (
          <ShowMaterial
            label={node.label}
            materialLabel={label}
            extra={extra}
            color={color}
            stock={material?.stock}
            variationId={variationId}
            node={node}
            material={material}
            onEdit={() => setIsEditing(true)}
            onDelete={() => variation.actions.removeMaterial(node.materialId)}
          />
        ) : (
          <EditMaterial
            type={material.type}
            typeRestrictions={node.typeRestrictions}
            materialId={node.materialId}
            onCancel={() => setIsEditing(false)}
            onSave={(materialId) => {
              variation.actions.updateMaterial(node.id, materialId);
              setIsEditing(false);
            }}
          />
        )}
      </ListItem>
    </ErrorBoundary>
  );
}

export default function MaterialListAccordion({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);
  const materialNodes: MaterialNode[] = graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n: any) => n.type === "MATERIAL"
      ) as MaterialNode[])
    : [];

  // Get materials module and hook
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const useMaterials = materialsModule.hooks.useMaterials;
  // Get all material IDs referenced in the graph
  const materialIds = materialNodes
    .map((node) => Number(node.materialId))
    .filter((id) => !Number.isNaN(id));
  const materials = useMaterials(materialIds);

  return (
    <>
      <AddMaterialButton variationId={variationId} />
      <List sx={{ p: 0, mt: 2 }}>
        {materialNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum material referenciado
            </Typography>
          </ListItem>
        ) : (
          materialNodes.map((node: MaterialNode) => {
            return (
              <MaterialItem
                variationId={variationId}
                key={node.id}
                node={node}
                material={materials[node.materialId]}
              />
            );
          })
        )}
      </List>
    </>
  );
}
