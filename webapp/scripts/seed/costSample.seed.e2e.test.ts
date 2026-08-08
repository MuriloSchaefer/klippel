/**
 * Seeds the **running** dev app with the cost sample:
 *
 *   npm run seed:cost-sample
 *
 * A dedicated `amostra-custo` workspace gets the bundled materials catalog
 * fixture (imported, then priced), a model whose variation holds those 5 materials,
 * 8 processes wired with consumption and 3 logos — several gated by electives,
 * one of which is off — the garment artwork uploaded, materials bound to parts
 * of that artwork and painted in their own colours, a PP–GG size curve, and a
 * budget whose quantity comes from that curve. The session is then
 * saved through the UI, because session data only moves on an explicit save
 * (CLAUDE.md) — without it nothing survives a restart.
 *
 * It reuses the very fixture and seeders the cost e2e test uses, so the sample
 * and the test can never drift apart.
 *
 * Why a jest file and not a `tsx` script: the seeders serialize functions into
 * the browser, and esbuild (which `tsx` uses) injects `__name` helpers into
 * them under `keepNames`, so they throw `__name is not defined` in the page —
 * the same breakage istanbul's `cov_*` causes in MCP tool files. Jest's swc
 * transform does not, and this stack is already proven under it.
 *
 * Guarded by `SEED_SAMPLE=1` so an ordinary `npm run test:e2e` skips it — it
 * rewrites a workspace and is not an assertion about the product.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";

import { resetWorkspace } from "@helpers/puppeteer/resetWorkspace";
import {
  priceCostSampleMaterials,
  seedCostSampleGraph,
  costSampleSVGPath,
} from "@helpers/puppeteer/seedCostSample";
import {
  SAMPLE_LOGOS,
  SAMPLE_MATERIALS,
  SAMPLE_PROCESSES,
  SAMPLE_VISUALIZATIONS,
  MATERIAL_COLOR_HEX,
  SAMPLE_GRADES,
  expectedTotalGarments,
  materialByRole,
  expectedLogoMoneyPerUnit,
  expectedMaterialMoneyPerUnit,
  expectedProcessMoneyPerUnit,
  expectedTotalMoneyPerUnit,
} from "@helpers/puppeteer/generateCostSample";
import { saveSessionViaUI } from "@kernel/modules/Store/components/drivers/SessionAutoSaver.click.puppeteer";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const WORKSPACE = process.env.SAMPLE_WORKSPACE ?? "amostra-custo";
const MODEL = "Camisa Polo Fem Raglan";
const BUDGET = "Pedido Escola Modelo";


let browser: Browser | null = null;
let page: Page | null = null;

jest.mock("../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";
import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { uploadVariationSVGTool } from "@system/modules/Composer/mcpTools/uploadVariationSVG";
import { switchViewTool } from "@system/modules/Composer/mcpTools/switchView";
import { importCatalogTool } from "@system/modules/Materials/mcpTools/importCatalog";
import { createBudgetTool } from "@system/modules/Orders/mcpTools/createBudget";


const brl = (n: number) => `R$ ${n.toFixed(2)}`;
const enabled = process.env.SEED_SAMPLE === "1";
const run = enabled ? describe : describe.skip;

beforeAll(async () => {
  if (!enabled) return;
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
});

run("seed: cost sample", () => {
  it("builds the sample in the running app", async () => {
    // eslint-disable-next-line no-console
    const log = (m: string) => console.log(`[sample] ${m}`);

    log(`resetting workspace "${WORKSPACE}"…`);
    await resetWorkspace(page!, WORKSPACE);

    log("importing the materials catalog fixture and pricing it…");
    await switchRibbonTabTool.execute({ label: "Materiais" });
    await importCatalogTool.execute();
    await priceCostSampleMaterials(page!);

    // The catalog hydrates lazily; reload so the renderer has it before the
    // material nodes are built against it, then open the stock viewport to
    // trigger that hydration.
    await page!.reload({ waitUntil: "domcontentloaded" });
    await page!.waitForSelector("#ribbon-menu-tabs");
    await switchRibbonTabTool.execute({ label: "Materiais" });
    await page!.click('[data-testid="open-material-stock"]');
    await page!.waitForSelector('[data-testid="material-stock-viewport"]');

    log(`creating model "${MODEL}"…`);
    await switchRibbonTabTool.execute({ label: "Compositor" });
    await page!.waitForSelector('[aria-label="create-model"]');
    await createModelTool.execute({ name: MODEL, id: "camisa-polo-fem-raglan" });
    await page!.waitForSelector('[role="pointer-panel-content"] #name', {
      hidden: true,
    });
    await openModelTool.execute({ modelName: MODEL });

    const variationId = await page!.evaluate(() => {
      const store = (globalThis as any).__klippelStore__;
      const vp = store.getState().Layout?.viewportManager;
      return vp?.viewports?.[vp.activeViewport]?.extra?.variationId as string;
    });

    log("uploading the garment artwork…");
    // The viewport opens in graph view; the upload empty-state lives in SVG view.
    await switchViewTool.execute({ view: "svg" });
    // Through the real upload flow — see `costSampleSVGPath` for why not a
    // dispatch. `uploadVariationSVG` waits for the editor to finish injecting.
    await uploadVariationSVGTool.execute({ filePath: costSampleSVGPath() });
    await page!.waitForSelector("#svg-editor");

    log(
      `building ${SAMPLE_MATERIALS.length} materials, ` +
        `${SAMPLE_PROCESSES.length} processes, ${SAMPLE_LOGOS.length} logos ` +
        `and ${SAMPLE_VISUALIZATIONS.length} visualizations…`,
    );
    await seedCostSampleGraph(page!, variationId);

    await expandAccordionTool.execute({ name: "Custo" });
    await page!.waitForSelector(
      '#process-cost-accordion[data-cost-total]:not([data-cost-total="0.00"])',
    );

    log(`creating budget "${BUDGET}"…`);
    await expandAccordionTool.execute({ name: "Orçamento" });
    // No amount is set: the line takes its quantity from the size curve.
    await createBudgetTool.execute({ label: BUDGET, color: "#2e7d32" });
    await page!.waitForSelector(
      `[data-testid="budget-item"][data-budget-item-amount="${expectedTotalGarments()}"]`,
    );

    // Nothing has reached disk yet — persist the snapshot the way a user would.
    log("saving session…");
    await saveSessionViaUI(page!);

    // The bindings must point at elements that actually exist in the uploaded
    // artwork — a visualization aimed at a missing id paints nothing.
    const boundDoms = SAMPLE_VISUALIZATIONS.flatMap((v) => v.doms.map((d) => d.id));
    const missing = await page!.evaluate((ids: string[]) => {
      const editor = document.querySelector("#svg-editor");
      return ids.filter((id) => !editor?.querySelector(`#${CSS.escape(id)}`));
    }, boundDoms);
    expect(missing).toEqual([]);

    // …and the drawing must actually *wear* the chosen material. Binding a
    // visualization only records intent; the colour arrives through an SVG
    // proxy, so this checks the rendered pixel-level style rather than the
    // graph, and would catch a proxy that never fired or bound the wrong
    // channel (the filetes are strokes, not fills).
    const mismatches = await page!.evaluate(
      (specs: { id: string; channel: "fill" | "stroke"; hex: string }[]) => {
        const toRgb = (hex: string) => {
          const n = parseInt(hex.slice(1), 16);
          return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
        };
        const editor = document.querySelector("#svg-editor");
        return specs
          .map((s) => {
            const el = editor?.querySelector(`#${CSS.escape(s.id)}`);
            if (!el) return { ...s, actual: "missing" };
            const actual = getComputedStyle(el as Element)[s.channel] as string;
            return actual === toRgb(s.hex) ? null : { ...s, actual };
          })
          .filter(Boolean);
      },
      SAMPLE_VISUALIZATIONS.flatMap((v) => {
        const material = materialByRole(v.role);
        const hex = MATERIAL_COLOR_HEX[material.cor];
        return v.doms.flatMap((d) =>
          [
            d.fill ? { id: d.id, channel: "fill" as const, hex } : null,
            d.stroke ? { id: d.id, channel: "stroke" as const, hex } : null,
          ].filter(Boolean as unknown as (x: unknown) => x is {
            id: string;
            channel: "fill" | "stroke";
            hex: string;
          }),
        );
      }),
    );
    expect(mismatches).toEqual([]);

    const total = await page!.$eval(
      "#process-cost-accordion",
      (el) => (el as HTMLElement).dataset.costTotal,
    );
    const lineTotal = await page!.$eval(
      '[data-testid="budget-item"]',
      (el) => (el as HTMLElement).dataset.budgetItemTotal,
    );

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        `  workspace         ${WORKSPACE}`,
        `  processos         ${brl(expectedProcessMoneyPerUnit())} / un`,
        `  materiais         ${brl(expectedMaterialMoneyPerUnit())} / un`,
        `  logos             ${brl(expectedLogoMoneyPerUnit())} / un`,
        `  total             R$ ${total} / un`,
        `  visualizações     ${SAMPLE_VISUALIZATIONS.length} materiais ligados à arte`,
        `  grade             ${SAMPLE_GRADES.map((g) => `${g.label} ${g.amount}`).join(" · ")}`,
        `  orçamento         ${BUDGET}: ${expectedTotalGarments()} un => R$ ${lineTotal}`,
        "",
      ].join("\n"),
    );

    expect(total).toBe(expectedTotalMoneyPerUnit().toFixed(2));
    expect(lineTotal).toBe(
      (expectedTotalMoneyPerUnit() * expectedTotalGarments()).toFixed(2),
    );
  }, 300_000);
});
