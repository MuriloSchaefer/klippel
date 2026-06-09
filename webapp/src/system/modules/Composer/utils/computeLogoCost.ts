import { compile } from "jse-eval";
import type { GraphState } from "@kernel/modules/Graphs/store/state";
import type {
  CompoundValue,
  UnitValue,
  ConversionNodes,
  ConvertionEdges,
} from "@system/modules/Converter/typings";
// Importing convert also runs Converter's top-level registerPlugin (e.g. sqrt),
// so any op the material/process cost expressions support is available here too.
import { convert } from "@system/modules/Converter/utils/convert";
import type {
  LogoNode,
  ElectiveNode,
  GraduationNode,
  LogoCostAudit,
  LogoPlacementCostAudit,
  LogoMethod,
  AttributeNormalisationAudit,
} from "../typings";

// Numeric weight per print method. `method` is exposed to the cost expression
// ONLY as this scalar (methodFactor) — never as a string — because the
// Converter engine's context is numeric-only and would parse a string literal
// as a phantom identifier and bail. Factors are placeholders pending the
// requester's table.
const METHOD_FACTORS: Record<LogoMethod, number> = {
  embroidery: 1,
  silkscreen: 0.6,
};

export function methodFactor(method: LogoMethod): number {
  return METHOD_FACTORS[method] ?? 1;
}

// Money cost as a CompoundValue (cost-per-piece). Units are descriptive labels
// only — garment-total aggregation that would consume/convert them is a
// separate future change, so the unit strings need not exist in the graph.
function moneyCost(amount: number): CompoundValue {
  return { quotient: { unit: "BRL", amount }, dividend: { unit: "un", amount: 1 } };
}

function safeCompile(expression: string): ((ctx: { [k: string]: number }) => unknown) | undefined {
  try {
    return compile(expression);
  } catch {
    return undefined;
  }
}

// Normalise a UnitValue to `targetUnit` via the Converter, recording the step in
// the audit (mirroring attributeNormalisations). No-op when already in unit.
function normalise(
  value: UnitValue,
  targetUnit: string,
  conversionGraph: GraphState<ConversionNodes, ConvertionEdges>,
  audit: AttributeNormalisationAudit[],
  name: string,
): number {
  if (value.unit === targetUnit) return value.amount;
  const converted = convert(conversionGraph as any, value, targetUnit);
  if (converted && "amount" in converted) {
    audit.push({
      attributeName: name,
      originalValue: value.amount,
      originalUnit: value.unit,
      normalisedValue: converted.amount,
      normalisedUnit: targetUnit,
    });
    return converted.amount;
  }
  return value.amount;
}

export function computeLogoCost({
  logoNodeId,
  graphState,
  conversionGraphState,
}: {
  logoNodeId: string;
  graphState: GraphState;
  conversionGraphState: GraphState<ConversionNodes, ConvertionEdges>;
}): { cost: CompoundValue | undefined; audit: LogoCostAudit | undefined } {
  const logoNode = graphState.nodes[logoNodeId] as LogoNode | undefined;
  if (!logoNode || logoNode.type !== "LOGO") {
    return { cost: undefined, audit: undefined };
  }

  const computedAt = new Date().toISOString();

  // Graduations → gradesTotal scalar (sum of piece counts) + breakdown for audit.
  const grads = Object.values(graphState.nodes).filter(
    (n): n is GraduationNode => (n as any).type === "GRADUATION",
  );
  const gradesBreakdown = grads.map((g) => ({
    graduationId: g.graduationId,
    label: g.label,
    amount: g.amount ?? 0,
  }));
  const gradesTotal = gradesBreakdown.reduce((s, g) => s + g.amount, 0);
  const mFactor = methodFactor(logoNode.method);

  // Elective gate — same pattern as ProcessNode: read the elective by id.
  if (logoNode.electiveNodeId) {
    const elective = graphState.nodes[logoNode.electiveNodeId] as
      | ElectiveNode
      | undefined;
    if (elective && elective.value === false) {
      return {
        cost: moneyCost(0),
        audit: {
          computedAt,
          skipped: true,
          skipReason: `Elétivo "${elective.label}" desabilitado`,
          methodFactor: mFactor,
          gradesTotal,
          gradesBreakdown,
          placements: [],
          total: 0,
        },
      };
    }
  }

  const expression = logoNode.costExpression;
  const fn = expression ? safeCompile(expression) : undefined;

  const placements: LogoPlacementCostAudit[] = [];
  let total = 0;
  for (const placement of logoNode.placements ?? []) {
    const norm: AttributeNormalisationAudit[] = [];
    // Normalise both dimensions to the width's unit so `width * height` is unit-consistent.
    const canonicalUnit = placement.size.width.unit;
    const width = normalise(placement.size.width, canonicalUnit, conversionGraphState, norm, "width");
    const height = normalise(placement.size.height, canonicalUnit, conversionGraphState, norm, "height");
    const context: { [k: string]: number } = {
      colors: logoNode.colors,
      width,
      height,
      methodFactor: mFactor,
      gradesTotal,
    };
    let cost = 0;
    if (fn) {
      try {
        const result = Number(fn(context));
        cost = Number.isFinite(result) ? result : 0;
      } catch {
        cost = 0;
      }
    }
    total += cost;
    placements.push({
      placementId: placement.placementId,
      name: placement.name,
      size: placement.size,
      skipped: false,
      attributeNormalisations: norm,
      context,
      expression,
      cost,
    });
  }

  return {
    cost: moneyCost(total),
    audit: {
      computedAt,
      skipped: false,
      methodFactor: mFactor,
      gradesTotal,
      gradesBreakdown,
      placements,
      total,
    },
  };
}
