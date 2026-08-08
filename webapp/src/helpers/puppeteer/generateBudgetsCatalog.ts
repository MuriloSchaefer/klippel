/* istanbul ignore file */
/**
 * Pure, PRNG-seeded generator for synthetic budget catalogs
 * (e2e-tests.md §11.3/§11.5). No `page` dependency — it just builds data.
 *
 * Every identity is a function of the row index, so a perf test *derives* the
 * budget or item it wants to address instead of scanning to discover it:
 *
 *   budget i  → id `budget-{seed}-{i}`, label `Orçamento {i}`
 *   item j    → id `mdl-{seed}-{i}-{j}-{hash5}`, modelId `mdl-{seed}-{i}-{j}`
 *
 * The `hash5` suffix mirrors production (`${modelId}-${hash5}`), where it is
 * what lets two variations of one model be two distinct lines. Here it is
 * derived from the PRNG rather than random, so a run is reproducible.
 *
 * Planted probes carry labels the index-derived naming never emits, so
 * targeted lookups stay unique by construction.
 */

export type SyntheticBudgetItem = {
  itemId: string;
  modelId: string;
  label: string;
  addedAt: number;
  /** Quantity for the line — index-derived so runs are comparable. */
  amount: number;
  /** Snapshotted cost per produced unit; total = `unitCost * amount`. */
  unitCost?: number;
  /** Snapshotted production minutes per unit; total = `unitMinutes * amount`. */
  unitMinutes?: number;
  costCapturedAt?: number;
};

export type SyntheticBudget = {
  id: string;
  label: string;
  color: string;
  viewportGroup: string;
  items: { [itemId: string]: SyntheticBudgetItem };
  createdAt: number;
};

export type BudgetCatalogIndex = {
  seed: string;
  /** Budgets generated, including the probe budget. */
  count: number;
  itemsPerBudget: number;
  totalItems: number;
  probes: { budget: string; item: string };
  firstId: string;
  lastId: string;
  /** A handful of ids spread across the range, for O(1) spot checks. */
  sampleIds: string[];
};

export type BudgetCatalog = {
  budgets: SyntheticBudget[];
  index: BudgetCatalogIndex;
};

/** Labels the generated naming never produces — see §11.3 planted probes. */
export const BUDGET_PROBE_TOKENS = {
  budget: "__probe_budget__",
  item: "__probe_item__",
} as const;

/** Same palette the ColorPicker offers, cycled by index. */
const COLORS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#7b1fa2",
  "#0288d1",
  "#5d4037",
  "#455a64",
];

/** mulberry32 — small, fast, deterministic. */
const prng = (seedStr: string) => {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash5 = (rand: () => number) =>
  Math.floor(rand() * 0x100000)
    .toString(16)
    .padStart(5, "0")
    .slice(0, 5);

export type GenerateBudgetsOptions = {
  /** Budgets to generate, excluding the planted probe budget. */
  count: number;
  /** Items per budget. */
  itemsPerBudget?: number;
  seed?: string;
  /** Epoch ms for `createdAt` / `addedAt`; fixed so runs are comparable. */
  now?: number;
};

export const generateBudgetsCatalog = ({
  count,
  itemsPerBudget = 1,
  seed = "budgets",
  now = 1_700_000_000_000,
}: GenerateBudgetsOptions): BudgetCatalog => {
  const rand = prng(seed);
  const budgets: SyntheticBudget[] = [];

  const buildItems = (
    budgetIndex: number,
    n: number,
    probeItem?: boolean,
  ): { [itemId: string]: SyntheticBudgetItem } => {
    const items: { [itemId: string]: SyntheticBudgetItem } = {};
    for (let j = 0; j < n; j++) {
      const modelId = `mdl-${seed}-${budgetIndex}-${j}`;
      const itemId = `${modelId}-${hash5(rand)}`;
      items[itemId] = {
        itemId,
        modelId,
        label: `Peça ${budgetIndex}.${j}`,
        addedAt: now + budgetIndex * 1000 + j,
        // Index-derived rather than random so a row's total is reproducible:
        // amounts cycle 1..5, unit cost is a stable function of the index.
        amount: (j % 5) + 1,
        unitCost: Number((10 + (j % 20) * 1.5).toFixed(2)),
        unitMinutes: 5 + (j % 12),
        costCapturedAt: now,
      };
    }
    if (probeItem) {
      const modelId = `mdl-${seed}-probe`;
      const itemId = `${modelId}-00000`;
      items[itemId] = {
        itemId,
        modelId,
        label: BUDGET_PROBE_TOKENS.item,
        addedAt: now,
        // Fixed so a test can assert an exact total: 3 × 12.50 = 37.50.
        amount: 3,
        unitCost: 12.5,
        unitMinutes: 20,
        costCapturedAt: now,
      };
    }
    return items;
  };

  for (let i = 0; i < count; i++) {
    const id = `budget-${seed}-${i}`;
    budgets.push({
      id,
      label: `Orçamento ${i}`,
      color: COLORS[i % COLORS.length],
      viewportGroup: id,
      items: buildItems(i, itemsPerBudget),
      createdAt: now + i,
    });
  }

  // Probe budget: uniquely labelled, carries the probe item. Always last so
  // its index does not shift the derived ids above it.
  const probeId = `budget-${seed}-probe`;
  budgets.push({
    id: probeId,
    label: BUDGET_PROBE_TOKENS.budget,
    color: COLORS[0],
    viewportGroup: probeId,
    items: buildItems(count, itemsPerBudget, true),
    createdAt: now + count,
  });

  const total = budgets.length;
  const sampleIds = [
    budgets[0].id,
    budgets[Math.floor(total / 2)].id,
    budgets[total - 1].id,
  ];

  return {
    budgets,
    index: {
      seed,
      count: total,
      itemsPerBudget,
      totalItems: budgets.reduce(
        (sum, b) => sum + Object.keys(b.items).length,
        0,
      ),
      probes: { budget: probeId, item: `mdl-${seed}-probe-00000` },
      firstId: budgets[0].id,
      lastId: budgets[total - 1].id,
      sampleIds,
    },
  };
};
