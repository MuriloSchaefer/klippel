/* istanbul ignore file */
/**
 * Seeding + teardown entry point for budget tests (e2e-tests.md §11.5).
 *
 * Budgets are Redux state persisted as one JSON file per budget under the
 * workspace's `.session/Orders/budgets/`. That gives two seeding paths, and the
 * cardinality tier decides which one is honest (§11.2):
 *
 *   - `store` — dispatch `createBudget` / `addItemToBudget` through the live
 *     store. Exercises reducer + middleware + one `writeBlob` per mutation, so
 *     it *is* the write surface. Use it to measure writes; use it up to the
 *     tier where the per-mutation persist stops being affordable.
 *   - `disk`  — write the budget JSON files directly from node, out of band,
 *     then let a workspace switch rehydrate them. The analogue of the
 *     direct-SQLite path for this module's storage: it is how you get to a
 *     large steady state without paying the write cost inside the measurement.
 *
 * Both take a catalog from `generateBudgetsCatalog` — never ad-hoc data — so
 * every id is index-derived and addressable a priori (§11.3).
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Page } from "puppeteer-core";

import type {
  SyntheticBudget,
  BudgetCatalog,
} from "./generateBudgetsCatalog";

const ENV_NAME =
  process.env.ENV_NAME ?? process.env.KLIPPEL_ENV_NAME ?? "small-app";
const WORKSPACES_DIR = join(homedir(), "klippel", "envs", ENV_NAME, "workspaces");

/** Where the Orders budgets slice persists, relative to the workspace root. */
export const BUDGETS_SESSION_PATH = ".session/Orders/budgets";

/**
 * Above this, dispatching one `createBudget` per budget through the live store
 * stops being a sensible *setup* mechanism — each dispatch triggers a
 * persist write. Past it, seed to disk and rehydrate instead (§11.2).
 */
export const LIVE_DISPATCH_MAX = 500;

const budgetsDir = (workspace: string) =>
  join(WORKSPACES_DIR, workspace, BUDGETS_SESSION_PATH);

/**
 * Write the catalog straight to the workspace's session folder. The app must
 * pick it up via a workspace switch (`softResetWorkspace`) or a reload — this
 * function only touches disk.
 */
export const seedBudgetsToDisk = (
  workspace: string,
  catalog: BudgetCatalog,
): number => {
  const dir = budgetsDir(workspace);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const t0 = performance.now();
  for (const budget of catalog.budgets) {
    writeFileSync(join(dir, `${budget.id}.json`), JSON.stringify(budget));
  }
  return performance.now() - t0;
};

/**
 * Switch the running app onto `workspace` **without** wiping it first.
 *
 * `softResetWorkspace` cannot be used to measure rehydration: it `rmSync`s the
 * target directory before switching, which deletes exactly the seeded files the
 * rehydrator is supposed to read. This dispatches the same `selectWorkspace`
 * command — the Store middleware sets the workspace scope, runs every
 * registered rehydrator against the new `.session/`, and dispatches the
 * per-slice rehydrate actions — and nothing else.
 *
 * The dispatch itself returns before the async rehydrators finish, so callers
 * must wait on the resulting state (`waitForBudgetCountInStore`).
 */
export const switchWorkspaceLive = async (
  page: Page,
  workspace: string,
): Promise<void> => {
  await page.evaluate(async (ws: string) => {
    const store = (
      globalThis as unknown as {
        __klippelStore__?: {
          dispatch: (a: { type: string; payload?: unknown }) => unknown;
        };
      }
    ).__klippelStore__;
    if (!store)
      throw new Error("switchWorkspaceLive: __klippelStore__ not exposed");
    await store.dispatch({
      type: "[Store:Command] Select workspace",
      payload: { workspace: ws },
    });
  }, workspace);
};

/**
 * Dispatch the catalog through the live store. Returns the wall-clock ms for
 * the whole batch — this is the *write* surface (reducer + middleware +
 * per-budget persist), not just setup.
 */
export const seedBudgetsViaStore = async (
  page: Page,
  catalog: BudgetCatalog,
): Promise<number> =>
  page.evaluate(async (budgets: SyntheticBudget[]) => {
    const store = (
      globalThis as unknown as {
        __klippelStore__?: {
          dispatch: (a: { type: string; payload?: unknown }) => unknown;
        };
      }
    ).__klippelStore__;
    if (!store)
      throw new Error("seedBudgetsViaStore: __klippelStore__ not exposed");

    const t0 = performance.now();
    for (const budget of budgets) {
      store.dispatch({
        type: "[Orders:Budgets:Command] Create budget",
        payload: budget,
      });
    }
    return performance.now() - t0;
  }, catalog.budgets as unknown as SyntheticBudget[]);

/**
 * Add `count` further items to an existing budget through the live store,
 * returning the batch wall-clock ms.
 */
export const addItemsViaStore = async (
  page: Page,
  budgetId: string,
  items: SyntheticBudget["items"],
): Promise<number> =>
  page.evaluate(
    async (id: string, itemMap: SyntheticBudget["items"]) => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: {
            dispatch: (a: { type: string; payload?: unknown }) => unknown;
          };
        }
      ).__klippelStore__;
      if (!store)
        throw new Error("addItemsViaStore: __klippelStore__ not exposed");

      const t0 = performance.now();
      for (const item of Object.values(itemMap)) {
        store.dispatch({
          type: "[Orders:Budgets:Command] Add item to budget",
          payload: { budgetId: id, item },
        });
      }
      return performance.now() - t0;
    },
    budgetId,
    items,
  );

/** How many budgets the store currently holds. */
export const countBudgets = async (page: Page): Promise<number> =>
  page.evaluate(() => {
    const store = (
      globalThis as unknown as {
        __klippelStore__?: { getState: () => Record<string, unknown> };
      }
    ).__klippelStore__;
    if (!store) throw new Error("countBudgets: __klippelStore__ not exposed");
    const state = store.getState() as {
      Orders?: { budgets?: Record<string, unknown> };
    };
    return Object.keys(state.Orders?.budgets ?? {}).length;
  });

/**
 * Wait until the store holds exactly `n` budgets.
 *
 * `waitForFunction` rather than a selector (§3 last resort) because the
 * rehydrate surface completes with no viewport — and therefore no accordion —
 * mounted, so the `data-budget-count` mirror does not exist to wait on. The
 * store is the only observable there.
 */
export const waitForBudgetCountInStore = async (
  page: Page,
  n: number,
): Promise<void> => {
  await page.waitForFunction(
    (expected: number) => {
      const store = (
        globalThis as unknown as {
          __klippelStore__?: { getState: () => Record<string, unknown> };
        }
      ).__klippelStore__;
      if (!store) return false;
      const state = store.getState() as {
        Orders?: { budgets?: Record<string, unknown> };
      };
      return Object.keys(state.Orders?.budgets ?? {}).length === expected;
    },
    {},
    n,
  );
};

/**
 * Drop every budget in the store. Test isolation for budgets: they live in a
 * workspace-wide slice, not on the viewport, so a budget created by one `it`
 * is still in the selector for the next one.
 */
export const clearBudgets = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const store = (
      globalThis as unknown as {
        __klippelStore__?: {
          getState: () => Record<string, unknown>;
          dispatch: (a: { type: string; payload?: unknown }) => unknown;
        };
      }
    ).__klippelStore__;
    if (!store) throw new Error("clearBudgets: __klippelStore__ not exposed");
    const state = store.getState() as {
      Orders?: { budgets?: Record<string, unknown> };
    };
    for (const id of Object.keys(state.Orders?.budgets ?? {})) {
      store.dispatch({
        type: "[Orders:Budgets:Command] Delete budget",
        payload: { id },
      });
    }
  });
};
