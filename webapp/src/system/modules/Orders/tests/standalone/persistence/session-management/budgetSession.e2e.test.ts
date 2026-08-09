/**
 * E2E — budgets and the session snapshot.
 *
 * Session data is a point-in-time snapshot: nothing writes to `.session/`
 * except an explicit whole-session save (e2e-tests.md §12). These tests pin
 * both halves of that contract:
 *
 *   1. A budget created but not saved leaves no trace on disk.
 *   2. Saving through the UI ("Salvar agora") writes it, and it survives a
 *      reload with its items, their grade curves and its colour intact.
 *   3. A budget deleted after being saved does not come back — the save
 *      reconciles, it does not merely add.
 *
 * The save always goes through the real control, never a dispatched action:
 * these tests exist to prove the *user's* save is what moves the snapshot.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import {
  addItemsViaStore,
  clearBudgets,
} from "@helpers/puppeteer/seedSyntheticBudgets";
import {
  generateBudgetsCatalog,
  gradesSummingTo,
} from "@helpers/puppeteer/generateBudgetsCatalog";
import { saveSessionViaUI } from "@kernel/modules/Store/components/drivers/SessionAutoSaver.click.puppeteer";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const WORKSPACE = "e2e-orders-budget-session";

const ENV_NAME =
  process.env.ENV_NAME ?? process.env.KLIPPEL_ENV_NAME ?? "small-app";
const BUDGETS_DIR = join(
  homedir(),
  "klippel",
  "envs",
  ENV_NAME,
  "workspaces",
  WORKSPACE,
  ".session/Orders/budgets",
);

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock("../../../../../../../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { createBudgetTool } from "@system/modules/Orders/mcpTools/createBudget";
import { deleteBudgetTool } from "@system/modules/Orders/mcpTools/deleteBudget";
import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";

const ROOT = '[data-testid="budget-accordion"]';
const ACCORDION = "Orçamento";

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const budgetBranch = (label: string) => `${ROOT}[data-budget-label="${label}"]`;
const itemCount = (n: number) => `${ROOT}[data-budget-item-count="${n}"]`;

/** Budget files currently on disk for this workspace. */
const persistedFiles = () =>
  existsSync(BUDGETS_DIR) ? readdirSync(BUDGETS_DIR) : [];

const openFreshModel = async (name: string) => {
  await createModelTool.execute({ name, id: `bs-${uniqueSuffix()}` });
  await page!.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: name });
  await expandAccordionTool.execute({ name: ACCORDION });
};

const enterComposer = async () => {
  await page!.waitForSelector("#ribbon-menu-tabs");
  await switchRibbonTabTool.execute({ label: "Compositor" });
  await page!.waitForSelector('[aria-label="create-model"]');
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
  await enterComposer();
}, 90_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  if (!page) return;
  await resetUIState(page);
  await clearBudgets(page);
}, 15_000);

describe("budget session snapshot (E2E)", () => {
  it("does not write a budget to disk until the session is saved", async () => {
    const model = `Session Unsaved ${uniqueSuffix()}`;
    const label = `orc-unsaved-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await page!.waitForSelector(budgetBranch(label));

    // The budget exists in the app but the snapshot has not moved.
    expect(persistedFiles()).toHaveLength(0);
  }, 90_000);

  it("persists a saved budget across a reload, with its grade curve and colour", async () => {
    const model = `Session Saved ${uniqueSuffix()}`;
    const label = `orc-saved-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label, color: "#7b1fa2" });

    // The line's quantity lives in its grade curve, so that is what has to
    // survive the round-trip. A fresh model has no graduations, so seed a
    // graded line rather than asserting the ungraded fallback of 1 — the
    // fallback would pass even if the curve were dropped on the way to disk.
    const budgetId = await page!.$eval(
      ROOT,
      (el) => (el as HTMLElement).dataset.budgetId ?? "",
    );
    const seeded = Object.values(
      generateBudgetsCatalog({ count: 1, itemsPerBudget: 1, seed: "session" })
        .budgets[0].items,
    )[0];
    const curve = gradesSummingTo(7);
    await addItemsViaStore(page!, budgetId, {
      [seeded.itemId]: { ...seeded, grades: curve },
    });
    await page!.waitForSelector(itemCount(2));

    await saveSessionViaUI(page!);
    expect(persistedFiles()).toHaveLength(1);

    // Reload onto the same workspace: the rehydrator reads what the save wrote.
    await page!.reload({ waitUntil: "domcontentloaded" });
    await page!.waitForSelector("#ribbon-menu-tabs");
    await enterComposer();
    await openModelTool.execute({ modelName: model });
    await expandAccordionTool.execute({ name: ACCORDION });

    // The budget survived. Its own viewport linkage did not (viewport `extra`
    // is Layout session state), so assert through the store-wide mirror and
    // the selector rather than the belongs branch.
    await page!.waitForSelector(`${ROOT}[data-budget-count="1"]`);
    const restored = await page!.evaluate(() => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { getState: () => Record<string, unknown> };
        }
      ).__klippelStore__;
      const state = store?.getState() as {
        Orders?: { budgets?: Record<string, any> };
      };
      const budget = Object.values(state?.Orders?.budgets ?? {})[0];
      return {
        label: budget?.label,
        color: budget?.color,
        // `?? null` on the way out: an ungraded line has no `grades` at all, and
        // `undefined` inside an array is not representable in the JSON puppeteer
        // serializes the result through — it would arrive as `null` anyway. Being
        // explicit keeps the expectation below honest about what crosses the wire.
        grades: Object.values(budget?.items ?? {}).map(
          (i: any) => i.grades ?? null,
        ),
      };
    });

    expect(restored.label).toBe(label);
    expect(restored.color).toBe("#7b1fa2");
    // Two lines: the seeded graded one keeps its curve, and the ungraded model
    // the budget was created with has none — which is how an ungraded piece
    // persists, and why its quantity falls back to 1 on the way back in.
    expect(restored.grades).toEqual(expect.arrayContaining([curve, null]));
  }, 120_000);

  it("does not resurrect a budget deleted after it was saved", async () => {
    const model = `Session Deleted ${uniqueSuffix()}`;
    const label = `orc-deleted-${uniqueSuffix()}`;

    await openFreshModel(model);
    await createBudgetTool.execute({ label });
    await saveSessionViaUI(page!);
    expect(persistedFiles()).toHaveLength(1);

    await deleteBudgetTool.execute();
    await page!.waitForSelector("#budget-actions");
    // Deleting alone must not touch the snapshot — the file is still there.
    expect(persistedFiles()).toHaveLength(1);

    // Saving reconciles: the file for the deleted budget goes away, otherwise
    // it would come back on the next rehydrate.
    await saveSessionViaUI(page!);
    expect(persistedFiles()).toHaveLength(0);
  }, 120_000);

  it("keeps a budget that was saved before an unsaved sibling was added", async () => {
    const first = `Session Keep A ${uniqueSuffix()}`;
    const second = `Session Keep B ${uniqueSuffix()}`;
    const savedLabel = `orc-keep-${uniqueSuffix()}`;
    const unsavedLabel = `orc-drop-${uniqueSuffix()}`;

    await openFreshModel(first);
    await createBudgetTool.execute({ label: savedLabel });
    await saveSessionViaUI(page!);
    expect(persistedFiles()).toHaveLength(1);

    // A second budget created but never saved stays out of the snapshot.
    await openFreshModel(second);
    await createBudgetTool.execute({ label: unsavedLabel });
    await page!.waitForSelector(itemCount(1));
    expect(persistedFiles()).toHaveLength(1);
  }, 120_000);
});
