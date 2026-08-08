import type { Converter } from "@system/modules/Converter/hooks/useConverter";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import {
  ElectiveNode,
  GraduationNode,
  LogoNode,
  MaterialNode,
  ProcessNode,
} from "../typings";

/** Attribute a material carries its price in: money per stock unit. */
export const MATERIAL_PRICE_ATTRIBUTE = "preco";

export type CostRow = {
  id: string;
  label: string;
  /** Money per produced unit, when it can be resolved. */
  moneyPerUnit?: number;
  /** Why it could not be resolved, for the "não precificado" hint. */
  unpricedReason?: string;
  /**
   * Gated by an elective that is currently off: shown for completeness, but
   * excluded from every total.
   */
  disabledByElective?: boolean;
};

export type VariationUnitCost = {
  /** One row per PROCESS node (labour). */
  rows: CostRow[];
  /** One row per MATERIAL node (consumption × price). */
  materialRows: CostRow[];
  /** One row per LOGO node (placements × method, from `computeLogoCost`). */
  logoRows: CostRow[];
  processMoneyPerUnit: number;
  materialMoneyPerUnit: number;
  logoMoneyPerUnit: number;
  /** Processes + materials + logos, per produced unit. */
  totalMoneyPerUnit: number;
  /**
   * Production time per produced unit, summed over every process
   * (`computedTimePerUnit`). Every process defines a time cost, so this is the
   * whole variation's minutes per garment.
   */
  totalMinutesPerUnit: number;
  /**
   * The size curve: how many garments the variation is graded for, per size and
   * in total. A budget line takes its quantity from here — the number of pieces
   * *is* the sum of the grade amounts, not something typed separately.
   */
  grades: { label: string; amount: number }[];
  totalGarments: number;
};

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

/**
 * Money per produced unit for one material node.
 *
 * `preco` is money **per the material's stock unit** — a plain number, because
 * the denominator is already pinned by `material.stock.unit` (a kilo-priced
 * fabric is stocked in kilos). Expressing it as a compound would invite the two
 * to disagree.
 *
 * Consumption comes from the computation middleware:
 * `computedStockEquivalentCost` when the consumption unit differs from the
 * stock unit, otherwise `computedCost` — which is already in stock units. Both
 * sides are therefore in the same unit and simply multiply.
 *
 * Returns `undefined` — never 0 — when either side is missing: an unpriced
 * material must read as "not priced", not as free.
 */
export const computeMaterialMoneyPerUnit = (
  node: MaterialNode,
  material: MaterialState | undefined,
): { moneyPerUnit?: number; unpricedReason?: string } => {
  const consumption = node.computedStockEquivalentCost ?? node.computedCost;
  if (!consumption) return { unpricedReason: "sem consumo calculado" };

  const price = asNumber(material?.attributes?.[MATERIAL_PRICE_ATTRIBUTE]);
  if (price === undefined) return { unpricedReason: "material sem preço" };

  const perGarment =
    consumption.quotient.amount / (consumption.dividend.amount || 1);
  if (asNumber(perGarment) === undefined)
    return { unpricedReason: "consumo inválido" };

  return { moneyPerUnit: perGarment * price };
};

/**
 * Aggregate a variation's cost per produced unit: process labour, material
 * consumption priced at the material's `preco`, and logo application.
 *
 * A process states its cost either directly per unit (`reais/unitário`) or per
 * minute (`reais/minuto`), in which case it is multiplied by the process's
 * computed time per unit. Anything that resolves to neither is left `undefined`
 * and contributes nothing to the total — an unpriced line must not silently
 * read as free-but-counted.
 *
 * Shared by `ProcessCostAccordion` and Orders (which snapshots the total onto a
 * budget item when the item is added) so the two cannot drift apart.
 */
export const computeVariationUnitCost = (
  processNodes: ProcessNode[],
  converter: Converter | undefined,
  materialNodes: MaterialNode[] = [],
  materials: { [id: string]: MaterialState } = {},
  electives: { [id: string]: ElectiveNode } = {},
  logoNodes: LogoNode[] = [],
  graduationNodes: GraduationNode[] = [],
): VariationUnitCost => {
  let processMoneyPerUnit = 0;

  /**
   * A process gated by an elective that is off is not part of this variation:
   * it is not performed, so it costs no money and takes no time.
   *
   * `computeProcessTime` and `computeMaterialCost` already skip these — the
   * former returns no `computedTimePerUnit`, the latter drops the consumption —
   * so time and material cost were already right. Process *money* comes
   * straight off the node here and has to be gated explicitly, or a disabled
   * step keeps billing.
   */
  const isDisabledByElective = (p: { electiveNodeId?: string }) => {
    if (!p.electiveNodeId) return false;
    const elective = electives[p.electiveNodeId];
    // An unresolvable elective is not treated as "off" — that would silently
    // drop a real cost. Only an elective that exists and is false disables.
    return !!elective && elective.value === false;
  };

  // Read a converted compound as a scalar, whichever shape it comes back in.
  const scalar = (converted: unknown): number | undefined => {
    if (!converted) return undefined;
    if ("quotient" in (converted as object)) {
      const q = (converted as any).quotient.amount;
      const d = (converted as any).dividend.amount || 1;
      return q / d;
    }
    if ("amount" in (converted as object)) return (converted as any).amount;
    return undefined;
  };

  /**
   * Each attempt gets its own guard. They used to share one `try`, so a process
   * priced per *minute* — whose per-unit conversion throws, there being no way
   * to turn R$/min into R$/un without the time — skipped the per-minute
   * fallback entirely and silently read as unpriced.
   */
  const tryConvert = (value: unknown, dividend: string) => {
    try {
      return scalar(
        converter?.convert(value as any, { quotient: "reais11", dividend }),
      );
    } catch {
      return undefined;
    }
  };

  /**
   * Read the cost directly when it is already quoted in the target units.
   *
   * The converter resolves a *path* between units and yields nothing for an
   * identity conversion, so `R$/min → R$/min` came back undefined and a
   * per-minute process read as unpriced. Ask the converter only when the units
   * genuinely differ.
   */
  const direct = (value: any, dividend: string): number | undefined =>
    value?.quotient?.unit === "reais11" && value?.dividend?.unit === dividend
      ? value.quotient.amount / (value.dividend.amount || 1)
      : undefined;

  const moneyIn = (value: unknown, dividend: string) =>
    direct(value, dividend) ?? tryConvert(value, dividend);

  let totalMinutesPerUnit = 0;

  const rows: CostRow[] = processNodes.map((p) => {
    const disabled = isDisabledByElective(p);
    if (disabled) {
      // Listed, but contributing nothing to either total. Showing the row keeps
      // the accordion an honest inventory of the variation; dropping it would
      // make a disabled step look deleted.
      return {
        id: p.id,
        label: p.label,
        moneyPerUnit: undefined,
        disabledByElective: true,
        unpricedReason: "eletivo desativado",
      };
    }

    let moneyPerUnit: number | undefined = undefined;
    const minutesPerUnit = p.computedTimePerUnit?.amount;
    if (minutesPerUnit) totalMinutesPerUnit += minutesPerUnit;

    if (p.costMoney) {
      moneyPerUnit = moneyIn(p.costMoney, "unitario18");

      if (moneyPerUnit === undefined && minutesPerUnit !== undefined) {
        const perMinute = moneyIn(p.costMoney, "minutos249");
        if (perMinute !== undefined) moneyPerUnit = perMinute * minutesPerUnit;
      }
    }

    if (moneyPerUnit) processMoneyPerUnit += moneyPerUnit;

    return {
      id: p.id,
      label: p.label,
      moneyPerUnit,
      unpricedReason:
        moneyPerUnit === undefined && !p.costMoney
          ? "processo sem custo"
          : undefined,
    };
  });

  let materialMoneyPerUnit = 0;
  const materialRows: CostRow[] = materialNodes.map((node) => {
    const { moneyPerUnit, unpricedReason } = computeMaterialMoneyPerUnit(
      node,
      materials[node.materialId],
    );
    if (moneyPerUnit) materialMoneyPerUnit += moneyPerUnit;
    return { id: node.id, label: node.label, moneyPerUnit, unpricedReason };
  });

  // Logos: `computeLogoCost` already produces a per-unit money figure (summed
  // over placements, scaled by method) and already zeroes a logo whose elective
  // is off. The gate is repeated here so the row can *say* it is disabled
  // rather than silently reading as R$ 0,00.
  let logoMoneyPerUnit = 0;
  const logoRows: CostRow[] = logoNodes.map((logo) => {
    if (isDisabledByElective(logo)) {
      return {
        id: logo.id,
        label: logo.label,
        moneyPerUnit: undefined,
        disabledByElective: true,
        unpricedReason: "eletivo desativado",
      };
    }
    const moneyPerUnit = direct(logo.computedCost, "unitario18");
    if (moneyPerUnit) logoMoneyPerUnit += moneyPerUnit;
    return {
      id: logo.id,
      label: logo.label,
      moneyPerUnit,
      unpricedReason:
        moneyPerUnit === undefined ? "custo do logo não calculado" : undefined,
    };
  });

  const grades = [...graduationNodes]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((g) => ({ label: g.label, amount: g.amount ?? 0 }));

  return {
    rows,
    materialRows,
    logoRows,
    grades,
    totalGarments: grades.reduce((sum, g) => sum + g.amount, 0),
    processMoneyPerUnit,
    materialMoneyPerUnit,
    logoMoneyPerUnit,
    totalMoneyPerUnit:
      processMoneyPerUnit + materialMoneyPerUnit + logoMoneyPerUnit,
    totalMinutesPerUnit,
  };
};
