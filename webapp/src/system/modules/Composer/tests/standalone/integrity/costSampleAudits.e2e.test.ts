/**
 * E2E integrity — the cost sample's arithmetic, checked against its own oracle.
 *
 * Builds the full cost sample (5 priced materials, 8 processes, 3 logos, two
 * electives with one off, a PP–GG size curve, the garment artwork) with the same
 * helpers `scripts/seed/costSample.seed.ts` uses, then asserts every figure the
 * app derives from it against `generateCostSample`'s `expected*` functions.
 *
 * Those functions are a genuine oracle rather than a restatement of the app: they
 * compute money and time from the sample's declared inputs directly, so if the
 * variation's aggregation drops a process, double-counts a material, or forgets
 * an elective gate, the two disagree.
 *
 * `integrity` rather than `functionality`: no single feature is under test. What
 * is pinned is that the numbers stay consistent *with each other* and with the
 * inputs, wherever you read them — per-row costs, the three subtotals, the total,
 * the per-material consumption audits, and the time accordion. Each of those is a
 * separate reading of the same underlying arithmetic, and they must agree.
 *
 * The elective that is **off** is the sharpest case: it gates both a process
 * (`Bordado`, 9 min / R$ 7.80) and a logo (`Logo costas`), and neither may reach
 * any total while both stay listed. A regression that silently includes them
 * still produces plausible-looking numbers — which is exactly why the oracle
 * filters them and this test compares against it.
 *
 * Setup is expensive (the whole sample), so it runs once in `beforeAll` and each
 * `it` asserts one facet of the result.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";

import { cleanupWorkspace, resetWorkspace } from "@helpers/puppeteer/resetWorkspace";
import { closeOpenOverlays, resetUIState } from "@helpers/puppeteer/closeOverlays";
import {
  costSampleSVGPath,
  priceCostSampleMaterials,
  seedCostSampleGraph,
} from "@helpers/puppeteer/seedCostSample";
import {
  activeLogos,
  activeProcesses,
  expectedLogoMoneyPerUnit,
  expectedMaterialKgPerUnit,
  expectedMaterialMoneyPerUnit,
  expectedMinutesPerUnit,
  expectedProcessMoneyPerUnit,
  expectedTotalGarments,
  expectedTotalMoneyPerUnit,
  logoMoneyPerUnit,
  materialNodeLabel,
  SAMPLE_LOGOS,
  SAMPLE_MATERIALS,
  SAMPLE_PROCESSES,
  type SampleProcess,
} from "@helpers/puppeteer/generateCostSample";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const WORKSPACE = "e2e-cost-sample-audits";
const MODEL = "Camisa Polo Fem Raglan";

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock("../../../../../../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { openMaterialAuditLogTool } from "@system/modules/Composer/mcpTools/openMaterialAuditLog";
import { switchViewTool } from "@system/modules/Composer/mcpTools/switchView";
import { uploadVariationSVGTool } from "@system/modules/Composer/mcpTools/uploadVariationSVG";
import { importCatalogTool } from "@system/modules/Materials/mcpTools/importCatalog";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";

const money = (value: number) => value.toFixed(2);

/** The money a process contributes per unit, as the sample declares it. */
const processMoney = (p: SampleProcess): number => {
  if (p.moneyPerUnit !== undefined) return p.moneyPerUnit;
  if (p.moneyPerMinute !== undefined) return p.moneyPerMinute * p.minutesPerUnit;
  return 0;
};

const costRow = (kind: "process" | "material" | "logo", label: string) =>
  `[data-testid="${kind}-cost-row"][data-cost-label="${label}"]`;

/**
 * Read a `data-cost-money` figure as a number.
 *
 * Compared with `toBeCloseTo`, not as a formatted string: the app and the oracle
 * sum the same terms in a different order, so the last bit of a float can differ
 * and round the other way at 2 dp. The quantity is what is under test, not the
 * formatting — the exact-string assertion is kept for the grand total, where the
 * seeder has long proven the two agree to the cent.
 */
const readMoney = async (selector: string): Promise<number> => {
  await page!.waitForSelector(selector);
  return page!.$eval(selector, (el) =>
    Number((el as HTMLElement).dataset.costMoney),
  );
};

/** Processes and logos the electives suppress — listed, but costing nothing. */
const disabledProcesses = () =>
  SAMPLE_PROCESSES.filter((p) => !activeProcesses().includes(p));
const disabledLogos = () =>
  SAMPLE_LOGOS.filter((l) => !activeLogos().includes(l));

/** `Consumo por unidade:` → the numeric figure, in the reported unit. */
const readPerUnit = (auditText: string): number => {
  const match = auditText.match(/Consumo por unidade:\s*([\d.]+)/);
  if (!match) {
    throw new Error(`No "Consumo por unidade" in audit text:\n${auditText}`);
  }
  return Number(match[1]);
};

/** `Total considerando graduações:` → the aggregate over the size curve. */
const readGradeTotal = (auditText: string): number => {
  const match = auditText.match(/Total considerando graduações:\s*([\d.]+)/);
  if (!match) {
    throw new Error(
      `No "Total considerando graduações" in audit text:\n${auditText}`,
    );
  }
  return Number(match[1]);
};

const openMaterialAudit = async (materialLabel: string): Promise<string> => {
  const result = await openMaterialAuditLogTool.execute({ materialLabel });
  const payload = JSON.parse(result.content[0].text);
  expect(payload.success).toBe(true);
  return payload.auditText as string;
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");

  await resetWorkspace(page, WORKSPACE);
  await page.waitForSelector("#ribbon-menu-tabs");

  // The catalog has to exist *and* carry prices before the material nodes are
  // built against it — an unpriced row would read as "não precificado" and every
  // material figure below would be absent rather than wrong.
  await switchRibbonTabTool.execute({ label: "Materiais" });
  await importCatalogTool.execute();
  await priceCostSampleMaterials(page);

  // The catalog hydrates lazily; reload so the renderer holds it, then open the
  // stock viewport to trigger that hydration (same order the seeder uses).
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#ribbon-menu-tabs");
  await switchRibbonTabTool.execute({ label: "Materiais" });
  await page.click('[data-testid="open-material-stock"]');
  await page.waitForSelector('[data-testid="material-stock-viewport"]');

  await switchRibbonTabTool.execute({ label: "Compositor" });
  await page.waitForSelector('[aria-label="create-model"]');
  await createModelTool.execute({ name: MODEL, id: "camisa-polo-fem-raglan" });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: MODEL });

  // The upload empty state lives in SVG view; the viewport opens on the graph.
  await switchViewTool.execute({ view: "svg" });
  await uploadVariationSVGTool.execute({ filePath: costSampleSVGPath() });
  await page.waitForSelector("#svg-editor");

  // The editor mirrors which variation it renders, so the graph is seeded
  // against the same id the viewport is showing — no store read needed.
  const variationId = await page.$eval(
    '[role="viewport-content"] #svg-editor',
    (el) => (el as SVGElement).dataset.variationId ?? "",
  );
  expect(variationId).not.toBe("");

  await seedCostSampleGraph(page, variationId);

  // The computation middleware is debounced, so wait for a real total rather
  // than asserting against a half-computed graph.
  await expandAccordionTool.execute({ name: "Custo" });
  await page.waitForSelector(
    '#process-cost-accordion[data-cost-total]:not([data-cost-total="0.00"])',
  );
}, 300_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

describe("cost sample — derived-value integrity (E2E)", () => {
  it("prices every row from the inputs the sample declares", async () => {
    await expandAccordionTool.execute({ name: "Custo" });

    for (const p of activeProcesses()) {
      expect(await readMoney(costRow("process", p.label))).toBeCloseTo(
        processMoney(p),
        2,
      );
    }
    for (const m of SAMPLE_MATERIALS) {
      expect(await readMoney(costRow("material", materialNodeLabel(m)))).toBeCloseTo(
        expectedMaterialKgPerUnit(m.id) * m.preco,
        2,
      );
    }
    for (const l of activeLogos()) {
      expect(await readMoney(costRow("logo", l.label))).toBeCloseTo(
        logoMoneyPerUnit(l),
        2,
      );
    }
  }, 120_000);

  it("lists what an elective suppresses without charging for it", async () => {
    await expandAccordionTool.execute({ name: "Custo" });

    // Still on the list — a disabled step is not a deleted one — but with no
    // money against it, so it cannot reach a subtotal.
    for (const p of disabledProcesses()) {
      await page!.waitForSelector(
        `${costRow("process", p.label)}[data-cost-disabled="true"][data-cost-money=""]`,
      );
    }
    for (const l of disabledLogos()) {
      await page!.waitForSelector(
        `${costRow("logo", l.label)}[data-cost-disabled="true"][data-cost-money=""]`,
      );
    }
    // The sample is only meaningful if it actually exercises the gate.
    expect(disabledProcesses().length).toBeGreaterThan(0);
    expect(disabledLogos().length).toBeGreaterThan(0);
  }, 120_000);

  it("adds the subtotals up to the total it quotes", async () => {
    await expandAccordionTool.execute({ name: "Custo" });

    // The grand total to the cent — the one figure a budget line snapshots, and
    // the assertion the seeder has been making all along.
    await page!.waitForSelector(
      `#process-cost-accordion[data-cost-total="${money(
        expectedTotalMoneyPerUnit(),
      )}"]`,
    );

    const processes = await readMoney("#process-cost-accordion-subtotal");
    const materials = await readMoney("#material-cost-accordion-subtotal");
    const logos = await readMoney("#logo-cost-accordion-subtotal");

    expect(processes).toBeCloseTo(expectedProcessMoneyPerUnit(), 2);
    expect(materials).toBeCloseTo(expectedMaterialMoneyPerUnit(), 2);
    expect(logos).toBeCloseTo(expectedLogoMoneyPerUnit(), 2);

    // …and internally: the total is those three subtotals and nothing else, so a
    // fourth contribution appearing from anywhere would show up here even if the
    // oracle were updated to match it.
    const total = await page!.$eval("#process-cost-accordion", (el) =>
      Number((el as HTMLElement).dataset.costTotal),
    );
    expect(processes + materials + logos).toBeCloseTo(total, 2);
  }, 120_000);

  it("audits each material's consumption and its size-curve total", async () => {
    const garments = expectedTotalGarments();

    try {
      for (const m of SAMPLE_MATERIALS) {
        // One panel at a time. Each audit is a `PointerContainer` Modal, and a
        // stack of them swallows the hit-test for the next row's trigger
        // (e2e-tests.md §5) — closing first also clears whatever a previous
        // iteration left open if it threw.
        await closeOpenOverlays(page!);
        const auditText = await openMaterialAudit(materialNodeLabel(m));

        // What every process consuming this material asks for, per garment. The
        // suppressed process consumes material 8, so this is also where a missed
        // elective gate on the *consumption* side would surface.
        expect(readPerUnit(auditText)).toBeCloseTo(
          expectedMaterialKgPerUnit(m.id),
          2,
        );
        // The same figure across the whole size curve — the audit's own
        // multiplication, checked against the curve the sample seeded.
        expect(readGradeTotal(auditText)).toBeCloseTo(
          expectedMaterialKgPerUnit(m.id) * garments,
          1,
        );
      }
    } finally {
      // Never hand the next `it` an open Modal, even on a failed assertion: the
      // accordion click that follows would hit the backdrop instead.
      await closeOpenOverlays(page!).catch(() => {});
    }
  }, 180_000);

  it("times the run over the processes that actually run", async () => {
    await expandAccordionTool.execute({ name: "Tempo" });

    const garments = expectedTotalGarments();
    await page!.waitForSelector(
      `#process-time-accordion[data-time-minutes-per-unit="${money(
        expectedMinutesPerUnit(),
      )}"][data-time-garments="${garments}"]` +
        `[data-time-total-minutes="${money(expectedMinutesPerUnit() * garments)}"]`,
    );

    // Each performed process reports its own minutes…
    for (const p of activeProcesses()) {
      await page!.waitForSelector(
        `[data-testid="process-time-item"][data-process-label="${p.label}"]` +
          `[data-process-minutes="${money(p.minutesPerUnit)}"]`,
      );
    }

    // …and a suppressed one is listed with **no** time at all. `computeProcessTime`
    // returns nothing for a process whose elective is off, rather than computing
    // minutes that then have to be excluded downstream — so the row reads "tempo
    // não definido" and the empty mirror is what keeps it out of the total above.
    for (const p of disabledProcesses()) {
      await page!.waitForSelector(
        `[data-testid="process-time-item"][data-process-label="${p.label}"]` +
          `[data-process-minutes=""]`,
      );
    }
  }, 120_000);
});
