/**
 * E2E — budgets ("orçamentos"): the full requirement set from
 * `Orders/docs/changes/2026-08-06-56f6e4-budget-refactor.md`.
 *
 *   1. A model in no budget shows the Criar / Adicionar branch.
 *   2. Creating a budget takes a name + a colour, seeds itself with the open
 *      model, and puts that model's tab in a colour-coded tab group.
 *   3. Another model can be added to an existing budget and joins the group.
 *   4. Re-opening a model (a *new variation*) is NOT in the budget — only an
 *      explicit add puts it there, and then as its own distinct line.
 *   5. Removing an item returns the accordion to the Criar / Adicionar branch
 *      and takes the tab out of the group.
 *   6. Deleting a budget dissolves the group but leaves the models open.
 *
 * Both the click and the keyboard path are covered (§8: one `describe` per
 * variant). Membership is asserted through the accordion's `data-*` mirrors
 * and through the tab's group-aware `aria-label`, never by reading text.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import {
  addItemsViaStore,
  clearBudgets,
} from "@helpers/puppeteer/seedSyntheticBudgets";
import { generateBudgetsCatalog } from "@helpers/puppeteer/generateBudgetsCatalog";
import { readItemTotal } from "@system/modules/Orders/components/BudgetAccordion/drivers/BudgetAccordion.click.puppeteer";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const WORKSPACE = "e2e-orders-budget";

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock("../../../../../../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { createBudgetTool } from "@system/modules/Orders/mcpTools/createBudget";
import { createBudgetShortcutTool } from "@system/modules/Orders/mcpTools/createBudgetShortcut";
import { addToBudgetTool } from "@system/modules/Orders/mcpTools/addToBudget";
import { addToBudgetShortcutTool } from "@system/modules/Orders/mcpTools/addToBudgetShortcut";
import { removeFromBudgetTool } from "@system/modules/Orders/mcpTools/removeFromBudget";
import { setBudgetItemAmountTool } from "@system/modules/Orders/mcpTools/setBudgetItemAmount";
import { deleteBudgetTool } from "@system/modules/Orders/mcpTools/deleteBudget";
import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";

const ACCORDION = "Orçamento";
const ROOT = '[data-testid="budget-accordion"]';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

/** Accordion is showing the "not in a budget" branch. */
const actionsBranch = "#budget-actions";
/** Accordion is showing the budget named `label`. */
const budgetBranch = (label: string) => `${ROOT}[data-budget-label="${label}"]`;
const itemCount = (n: number) => `${ROOT}[data-budget-item-count="${n}"]`;
const budgetCount = (n: number) => `${ROOT}[data-budget-count="${n}"]`;
const itemRow = (label: string) =>
  `[data-testid="budget-item"][data-budget-item-label="${label}"]`;
/** A viewport tab that belongs to `budget`'s tab group. */
const groupedTab = (title: string, budget: string) =>
  `[role="tab"][aria-label="${title} — ${budget}"]`;

/** Create a model, open it, and expand the budget accordion on its viewport. */
const openFreshModel = async (name: string) => {
  await createModelTool.execute({ name, id: `bm-${uniqueSuffix()}` });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await expandAccordionTool.execute({ name: ACCORDION });
};

/** Re-open an already-created model — yields a second, independent variation. */
const openAgain = async (name: string) => {
  await openModelTool.execute({ modelName: name });
  await expandAccordionTool.execute({ name: ACCORDION });
};

/**
 * Budgets live in a workspace-wide slice, not on the viewport, so one left by a
 * failing `it` would still be in the next one's selector. Clear the slice
 * itself rather than relying on each test's own teardown (§4).
 */
const clearAllBudgets = async () => {
  await clearBudgets(page!);
  await page!.waitForSelector(budgetCount(0));
};

beforeAll(async () => {
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");

  await resetWorkspace(page, WORKSPACE);
  await page.waitForSelector("#ribbon-menu-tabs");
  await switchRibbonTabTool.execute({ label: "Compositor" });
  await page.waitForSelector('[aria-label="create-model"]');
}, 90_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  if (!page) return;
  await resetUIState(page);
  // Start from zero budgets even if a previous `it` failed before its own
  // teardown. No mirror wait here: the first test runs before any viewport
  // (and therefore any accordion) exists.
  await clearBudgets(page);
}, 15_000);

describe("budgets via click (E2E)", () => {
  it("offers Criar / Adicionar when the model is in no budget", async () => {
    await openFreshModel(`Budget Empty ${uniqueSuffix()}`);

    await page!.waitForSelector(actionsBranch);
    await page!.waitForSelector('[data-testid="create-budget"]');
    // No budget exists yet in this workspace, so the add path explains itself
    // instead of offering an empty selector.
    await page!.waitForSelector("#add-to-budget-empty");
  }, 90_000);

  it("creates a budget with a name and a colour, seeded with the open model", async () => {
    const model = `Budget Create ${uniqueSuffix()}`;
    const label = `orc-c-${uniqueSuffix()}`;
    await openFreshModel(model);

    await createBudgetTool.execute({ label, color: "#2e7d32" });

    await page!.waitForSelector(budgetBranch(label));
    await page!.waitForSelector(itemCount(1));
    await page!.waitForSelector(`#budget-color-swatch[data-color="#2e7d32"]`);
    await page!.waitForSelector(itemRow(model));
    // The model's tab joined the budget's colour-coded tab group.
    await page!.waitForSelector(groupedTab(model, label));

    await clearAllBudgets();
  }, 90_000);

  it("adds a second model to an existing budget and groups both tabs", async () => {
    const first = `Budget A ${uniqueSuffix()}`;
    const second = `Budget B ${uniqueSuffix()}`;
    const label = `orc-add-${uniqueSuffix()}`;

    await openFreshModel(first);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(itemCount(1));

    await openFreshModel(second);
    // The second model starts outside the budget.
    await page!.waitForSelector(actionsBranch);

    await addToBudgetTool.execute({ label });

    await page!.waitForSelector(budgetBranch(label));
    await page!.waitForSelector(itemCount(2));
    await page!.waitForSelector(itemRow(first));
    await page!.waitForSelector(itemRow(second));
    await page!.waitForSelector(groupedTab(first, label));
    await page!.waitForSelector(groupedTab(second, label));

    await clearAllBudgets();
  }, 120_000);

  it("does not put a re-opened model in the budget until it is added", async () => {
    const model = `Budget Variation ${uniqueSuffix()}`;
    const label = `orc-var-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(itemCount(1));

    // Same model, second variation: a fresh viewport with no linkage. It must
    // land on the Criar / Adicionar branch — membership is per item, never
    // inferred from the model id.
    await openAgain(model);
    await page!.waitForSelector(actionsBranch);
    await page!.waitForSelector(budgetBranch(label), { hidden: true });

    // Adding it explicitly gives the budget a second, distinct line for the
    // same model — which is what the item-id hash suffix exists for.
    await addToBudgetTool.execute({ label });
    await page!.waitForSelector(itemCount(2));
    const itemIds = await page!.$$eval(
      '[data-testid="budget-item"]',
      (rows) =>
        rows.map((r) => (r as HTMLElement).dataset.budgetItemId ?? ""),
    );
    expect(new Set(itemIds).size).toBe(2);

    await clearAllBudgets();
  }, 120_000);

  it("shows each item's name, amount and total cost, and recomputes on amount change", async () => {
    const model = `Budget Amount ${uniqueSuffix()}`;
    const label = `orc-amt-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(itemRow(model));

    // Name and amount are on the row; a fresh line is one piece.
    await page!.waitForSelector(
      `${itemRow(model)}[data-budget-item-amount="1"]`,
    );

    // This model has no priced process, so the line is explicitly *unpriced*
    // rather than shown as zero — a piece with no cost must never read as free.
    const totalBefore = await readItemTotal(page!, model);
    expect(totalBefore).toBe("");
    const caption = await page!.$eval(
      `${itemRow(model)} [data-testid="budget-item-total"]`,
      (el) => (el as HTMLElement).innerText,
    );
    expect(caption).toContain("não precificado");

    // This model has no process either, so there is no production time to show
    // — and the line says so rather than claiming zero.
    const timeCaption = await page!.$eval(
      `${itemRow(model)} [data-testid="budget-item-total-time"]`,
      (el) => (el as HTMLElement).innerText,
    );
    expect(timeCaption).toContain("não calculada");

    // Changing the amount is what makes the total meaningful, so it is part of
    // the contract, not just display.
    await setBudgetItemAmountTool.execute({ label: model, amount: 4 });
    await page!.waitForSelector(
      `${itemRow(model)}[data-budget-item-amount="4"]`,
    );

    await clearAllBudgets();
  }, 90_000);

  it("totals a priced line as unit cost × amount", async () => {
    // Priced lines need a variation with a costed process, which the seeded
    // catalog provides directly: the planted probe is 3 × 12.50 = 37.50.
    const model = `Budget Priced ${uniqueSuffix()}`;
    const label = `orc-priced-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(itemCount(1));

    const budgetId = await page!.$eval(
      ROOT,
      (el) => (el as HTMLElement).dataset.budgetId ?? "",
    );
    const priced = generateBudgetsCatalog({
      count: 1,
      itemsPerBudget: 1,
      seed: "priced",
    }).budgets[0].items;
    await addItemsViaStore(page!, budgetId, priced);
    await page!.waitForSelector(itemCount(2));

    // amount 1 × unitCost 10.00 for the index-0 generated item.
    const seeded = Object.values(priced)[0];
    const expected = (seeded.unitCost! * seeded.amount).toFixed(2);
    await page!.waitForSelector(
      `[data-testid="budget-item"][data-budget-item-id="${seeded.itemId}"][data-budget-item-total="${expected}"]`,
    );

    // Production time for the whole line, alongside the money.
    await page!.waitForSelector(
      `[data-testid="budget-item"][data-budget-item-id="${seeded.itemId}"]` +
        `[data-budget-item-total-minutes="${(
          seeded.unitMinutes! * seeded.amount
        ).toFixed(2)}"]`,
    );

    // Doubling the amount doubles both totals — the row recomputes from the
    // snapshotted unit cost and unit time.
    await setBudgetItemAmountTool.execute({
      label: seeded.label,
      amount: seeded.amount * 2,
    });
    const doubled = (seeded.unitCost! * seeded.amount * 2).toFixed(2);
    expect(await readItemTotal(page!, seeded.label)).toBe(doubled);
    await page!.waitForSelector(
      `[data-testid="budget-item"][data-budget-item-id="${seeded.itemId}"]` +
        `[data-budget-item-total-minutes="${(
          seeded.unitMinutes! * seeded.amount * 2
        ).toFixed(2)}"]`,
    );

    await clearAllBudgets();
  }, 120_000);

  it("removes an item, returning the tab and the accordion to the unassigned state", async () => {
    const model = `Budget Remove ${uniqueSuffix()}`;
    const label = `orc-rm-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(groupedTab(model, label));

    await removeFromBudgetTool.execute();

    await page!.waitForSelector(actionsBranch);
    await page!.waitForSelector(budgetBranch(label), { hidden: true });
    // The tab left the group — its accessible name no longer carries the budget.
    await page!.waitForSelector(groupedTab(model, label), { hidden: true });

    await clearAllBudgets();
  }, 90_000);

  it("deletes a budget, dissolving the tab group but leaving the model open", async () => {
    const model = `Budget Delete ${uniqueSuffix()}`;
    const label = `orc-del-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(budgetCount(1));

    await deleteBudgetTool.execute();

    await page!.waitForSelector(actionsBranch);
    await page!.waitForSelector(budgetCount(0));
    await page!.waitForSelector(groupedTab(model, label), { hidden: true });
    // The viewport itself survives: deleting a budget must not close models.
    await page!.waitForSelector(`[role="tab"][aria-label="${model}"]`);
  }, 90_000);
});

describe("budgets via shortcut (E2E)", () => {
  it("creates a budget through the keyboard path", async () => {
    const model = `Budget SC Create ${uniqueSuffix()}`;
    const label = `orc-s-${uniqueSuffix()}`;
    await openFreshModel(model);

    await createBudgetShortcutTool.execute({ label });

    await page!.waitForSelector(budgetBranch(label));
    await page!.waitForSelector(itemCount(1));
    await page!.waitForSelector(groupedTab(model, label));

    await clearAllBudgets();
  }, 90_000);

  it("adds a model to an existing budget through the keyboard path", async () => {
    const first = `Budget SC A ${uniqueSuffix()}`;
    const second = `Budget SC B ${uniqueSuffix()}`;
    const label = `orc-sa-${uniqueSuffix()}`;

    await openFreshModel(first);
    await createBudgetShortcutTool.execute({ label });
    await page!.waitForSelector(itemCount(1));

    await openFreshModel(second);
    await addToBudgetShortcutTool.execute({ label });

    await page!.waitForSelector(budgetBranch(label));
    await page!.waitForSelector(itemCount(2));
    await page!.waitForSelector(groupedTab(second, label));

    await clearAllBudgets();
  }, 120_000);
});
