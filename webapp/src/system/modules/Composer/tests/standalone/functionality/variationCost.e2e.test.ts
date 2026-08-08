/**
 * E2E — cost per produced unit over a seeded sample: 5 priced materials,
 * 8 processes and 3 logos, several gated by electives.
 *
 * The sample (see `helpers/puppeteer/generateCostSample.ts`) is shaped to hit
 * the cases the formula has to get right:
 *
 *   - `Corte` consumes **3** materials at once,
 *   - `Revisão` consumes **none** — labour still counts, and it must not
 *     invent a material line,
 *   - `Malha PV` and `Tricoline` are each consumed by **two** processes, so
 *     their per-unit consumption accumulates,
 *   - `Enfesto` is priced per minute (× `costTime`), not per unit,
 *   - `Inspeção final` has no money at all and must read "não precificado"
 *     rather than 0 — an unpriced step is not a free step,
 *   - `Bordado` is gated by an elective that is **off**: it is priced, timed
 *     and consumes a material, yet must contribute to none of the three,
 *   - the logos cover all three elective states — none, on, off — so an
 *     elective that is *on* is proven not to suppress anything.
 *
 * Every expected number is derived from the fixture, never hard-coded here, so
 * changing a price or a consumption keeps the assertions honest.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import {
  priceCostSampleMaterials,
  seedCostSampleGraph,
} from "@helpers/puppeteer/seedCostSample";
import {
  SAMPLE_ELECTIVES,
  SAMPLE_LOGOS,
  SAMPLE_MATERIALS,
  SAMPLE_PROCESSES,
  SAMPLE_VISUALIZATIONS,
  activeLogos,
  materialByRole,
  expectedLogoMoneyPerUnit,
  expectedMaterialKgPerUnit,
  expectedMinutesPerUnit,
  expectedTotalGarments,
  SAMPLE_GRADES,
  logoMoneyPerUnit,
  expectedMaterialMoneyPerUnit,
  expectedProcessMoneyPerUnit,
  expectedTotalMoneyPerUnit,
  materialNodeLabel,
} from "@helpers/puppeteer/generateCostSample";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const WORKSPACE = "e2e-composer-variation-cost";

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
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";
import { expandAccordionTool } from "@kernel/modules/Layout/mcpTools/expandAccordion";
import { importCatalogTool } from "@system/modules/Materials/mcpTools/importCatalog";

const ACCORDION = "Custo";
const COST_ROOT = "#process-cost-accordion";

const money = (n: number) => n.toFixed(2);

/** The variation id of the currently active ModelViewport. */
const activeVariationId = () =>
  page!.evaluate(() => {
    const store = (globalThis as any).__klippelStore__;
    const vp = store.getState().Layout?.viewportManager;
    return vp?.viewports?.[vp.activeViewport]?.extra?.variationId as string;
  });

const rowMoney = (kind: "process" | "material" | "logo", label: string) =>
  page!.$eval(
    `[data-testid="${kind}-cost-row"][data-cost-label="${label}"]`,
    (el) => (el as HTMLElement).dataset.costMoney ?? "",
  );

beforeAll(async () => {
  browser = await puppeteer.connect({
    browserURL: CDP_URL,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith("http://localhost:")) ?? pages[0];
  if (!page) throw new Error("No renderer page found in Electron");

  await resetWorkspace(page, WORKSPACE);

  // Import the bundled catalog fixture rather than seeding one: it already
  // carries correct type schemas (`cor` as the extra selector) and realistic
  // rows. It has no prices, so those are patched on.
  await switchRibbonTabTool.execute({ label: "Materiais" });
  await importCatalogTool.execute();
  await priceCostSampleMaterials(page);

  // The catalog hydrates lazily; reload so the renderer picks it up before
  // material nodes are built against it.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector("#ribbon-menu-tabs");
  await switchRibbonTabTool.execute({ label: "Materiais" });
  await page.click('[data-testid="open-material-stock"]');
  await page.waitForSelector('[data-testid="material-stock-viewport"]');

  await switchRibbonTabTool.execute({ label: "Compositor" });
  await page.waitForSelector('[aria-label="create-model"]');
  await createModelTool.execute({
    name: "Camisa Polo Fem Raglan",
    id: "camisa-polo-fem-raglan",
  });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
  await openModelTool.execute({ modelName: "Camisa Polo Fem Raglan" });

  await seedCostSampleGraph(page, await activeVariationId());
  await expandAccordionTool.execute({ name: ACCORDION });
  // The computation middleware fills in consumption before any cost shows.
  await page.waitForSelector(
    `[data-testid="material-cost-row"][data-cost-label="${materialNodeLabel(
      SAMPLE_MATERIALS[0],
    )}"][data-cost-money]:not([data-cost-money=""])`,
  );
}, 180_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

describe("variation cost — 5 materials, 8 processes, 3 logos (E2E)", () => {
  it("lists every process and every material", async () => {
    const processes = await page!.$$eval(
      '[data-testid="process-cost-row"]',
      (els) => els.map((e) => (e as HTMLElement).dataset.costLabel),
    );
    const materials = await page!.$$eval(
      '[data-testid="material-cost-row"]',
      (els) => els.map((e) => (e as HTMLElement).dataset.costLabel),
    );

    expect(processes).toHaveLength(SAMPLE_PROCESSES.length);
    expect(processes).toEqual(
      expect.arrayContaining(SAMPLE_PROCESSES.map((p) => p.label)),
    );
    expect(materials).toHaveLength(SAMPLE_MATERIALS.length);
    expect(materials).toEqual(
      expect.arrayContaining(SAMPLE_MATERIALS.map(materialNodeLabel)),
    );
  }, 90_000);

  it("prices each process, including the per-minute one", async () => {
    for (const p of SAMPLE_PROCESSES) {
      // A process gated off by an elective is priced as nothing, whatever its
      // own costMoney says — covered in its own test below.
      const expected = p.electiveId
        ? ""
        : p.moneyPerUnit !== undefined
          ? money(p.moneyPerUnit)
          : p.moneyPerMinute !== undefined
            ? money(p.moneyPerMinute * p.minutesPerUnit)
            : "";
      expect(await rowMoney("process", p.label)).toBe(expected);
    }
  }, 90_000);

  it("leaves the unpriced process unpriced rather than free", async () => {
    const unpriced = SAMPLE_PROCESSES.find(
      (p) => p.moneyPerUnit === undefined && p.moneyPerMinute === undefined,
    )!;
    expect(await rowMoney("process", unpriced.label)).toBe("");

    const caption = await page!.$eval(
      `[data-testid="process-cost-row"][data-cost-label="${unpriced.label}"]`,
      (el) => (el as HTMLElement).innerText,
    );
    expect(caption).toContain("não definido");
  }, 90_000);

  it("prices each material as consumption × preço, accumulating across processes", async () => {
    for (const m of SAMPLE_MATERIALS) {
      const expected = expectedMaterialKgPerUnit(m.id) * m.preco;
      expect(await rowMoney("material", materialNodeLabel(m))).toBe(
        money(expected),
      );
    }

    // The principal fabric is consumed by two active processes
    // (Corte 0.45 + Acabamento 0.05): the row must show the sum, not the last
    // edge seen.
    const principal = materialByRole("material-principal");
    expect(expectedMaterialKgPerUnit(principal.id)).toBeCloseTo(0.5, 5);
  }, 90_000);

  it("renders the process list even when a process has no cost at all", async () => {
    // `Inspeção final` has neither costMoney nor costTime. ProcessItem used to
    // undo its own optional chaining with `units![node.costTime!...]` on the
    // next line, so one such process took down the whole list with
    // "Cannot read properties of undefined (reading 'quotient')".
    await expandAccordionTool.execute({ name: "Processos" }).catch(() => {});
    await page!.waitForSelector('[data-testid="process-item"]');

    const rows = await page!.$$eval(
      '[data-testid="process-item"]',
      (els) => els.length,
    );
    expect(rows).toBe(SAMPLE_PROCESSES.length);

    // The unpriced one renders a placeholder rather than blowing up.
    const texts = await page!.$$eval(
      '[data-testid="process-item-money"]',
      (els) => els.map((e) => (e as HTMLElement).innerText),
    );
    expect(texts).toContain("não definido");
  }, 90_000);

  it("gives every process a time cost", async () => {
    // Money is optional, time is not: a step that takes no time is not a step,
    // and `computedTimePerUnit` (and any per-minute pricing) depends on it.
    await expandAccordionTool.execute({ name: "Processos" }).catch(() => {});
    await page!.waitForSelector('[data-testid="process-item"]');

    const times = await page!.$$eval(
      '[data-testid="process-item-time"]',
      (els) => els.map((e) => (e as HTMLElement).innerText),
    );
    expect(times).toHaveLength(SAMPLE_PROCESSES.length);
    for (const t of times) expect(t).not.toBe("não definido");

    // …and it reaches the computation: every process resolves a time per unit.
    const computed = await page!.evaluate((graphIdHint: string) => {
      const store = (globalThis as any).__klippelStore__;
      const graphs = store.getState().Graph?.graphs ?? {};
      const graph = graphs[graphIdHint] ?? Object.values(graphs)[0];
      return Object.values(graph?.nodes ?? {})
        .filter((n: any) => n.type === "PROCESS")
        .map((n: any) => ({
          label: n.label,
          minutes: n.computedTimePerUnit?.amount,
        }));
    }, await activeVariationId());

    expect(computed).toHaveLength(SAMPLE_PROCESSES.length);
    for (const p of SAMPLE_PROCESSES) {
      const found = computed.find((c) => c.label === p.label);
      // A process gated off by an elective is not performed, so it resolves no
      // time — `computeProcessTime` already skips it.
      expect(found?.minutes).toBe(p.electiveId ? undefined : p.minutesPerUnit);
    }
  }, 90_000);

  it("excludes a process gated by a falsy elective from cost and time", async () => {
    const gated = SAMPLE_PROCESSES.find((p) => p.electiveId)!;
    const elective = SAMPLE_ELECTIVES.find((e) => e.id === gated.electiveId)!;
    expect(elective.value).toBe(false);

    // Listed — a disabled step is not a deleted one — but contributing nothing.
    const row = `[data-testid="process-cost-row"][data-cost-label="${gated.label}"]`;
    await page!.waitForSelector(`${row}[data-cost-disabled="true"]`);
    expect(await rowMoney("process", gated.label)).toBe("");

    // Its money is out of the process subtotal…
    const processSubtotal = await page!.$eval(
      "#process-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    expect(processSubtotal).toBe(money(expectedProcessMoneyPerUnit()));
    expect(Number(processSubtotal)).toBeLessThan(
      expectedProcessMoneyPerUnit() + gated.moneyPerUnit!,
    );

    // …its material consumption is out of the material subtotal…
    const consumed = gated.consumes[0];
    const material = SAMPLE_MATERIALS.find((m) => m.id === consumed.materialId)!;
    expect(await rowMoney("material", materialNodeLabel(material))).toBe(
      money(expectedMaterialKgPerUnit(material.id) * material.preco),
    );

    // …and its minutes are out of the production time.
    const computed = await page!.evaluate((graphIdHint: string) => {
      const store = (globalThis as any).__klippelStore__;
      const graphs = store.getState().Graph?.graphs ?? {};
      const graph = graphs[graphIdHint] ?? Object.values(graphs)[0];
      return Object.values(graph?.nodes ?? {})
        .filter((n: any) => n.type === "PROCESS")
        .reduce((sum: number, n: any) => sum + (n.computedTimePerUnit?.amount ?? 0), 0);
    }, await activeVariationId());
    expect(computed).toBe(expectedMinutesPerUnit());
  }, 90_000);

  it("prices every logo, and charges one whose elective is on", async () => {
    const logos = await page!.$$eval('[data-testid="logo-cost-row"]', (els) =>
      els.map((e) => (e as HTMLElement).dataset.costLabel),
    );
    expect(logos).toHaveLength(SAMPLE_LOGOS.length);

    for (const l of activeLogos()) {
      // `colors × methodFactor × placementFactor`, summed over placements.
      expect(await rowMoney("logo", l.label)).toBe(money(logoMoneyPerUnit(l)));
    }

    // The one with an elective that is ON is charged like any other — an
    // elective only suppresses when it is off.
    const enabled = activeLogos().find((l) => l.electiveId)!;
    expect(Number(await rowMoney("logo", enabled.label))).toBeGreaterThan(0);

    const subtotal = await page!.$eval(
      "#logo-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    expect(subtotal).toBe(money(expectedLogoMoneyPerUnit()));
  }, 90_000);

  it("excludes a logo gated by a falsy elective", async () => {
    const gated = SAMPLE_LOGOS.find(
      (l) =>
        l.electiveId &&
        SAMPLE_ELECTIVES.find((e) => e.id === l.electiveId)?.value === false,
    )!;

    await page!.waitForSelector(
      `[data-testid="logo-cost-row"][data-cost-label="${gated.label}"][data-cost-disabled="true"]`,
    );
    expect(await rowMoney("logo", gated.label)).toBe("");

    // Its price is real, and still absent from the subtotal.
    expect(logoMoneyPerUnit(gated)).toBeGreaterThan(0);
    const subtotal = await page!.$eval(
      "#logo-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    expect(Number(subtotal)).toBe(expectedLogoMoneyPerUnit());
    expect(Number(subtotal)).toBeLessThan(
      expectedLogoMoneyPerUnit() + logoMoneyPerUnit(gated),
    );
  }, 90_000);

  it("binds each visualization to its material and art elements", async () => {
    // Cost does not read visualizations, but the sample wires them, so a
    // mis-seeded binding would otherwise go unnoticed until someone opened the
    // Visualização panel. This suite uploads no artwork, so the dom ids are
    // asserted as *references*; the seed script checks they resolve in the real
    // drawing.
    const vis = await page!.evaluate((graphIdHint: string) => {
      const store = (globalThis as any).__klippelStore__;
      const graphs = store.getState().Graph?.graphs ?? {};
      const graph = graphs[graphIdHint] ?? Object.values(graphs)[0];
      return Object.values(graph?.nodes ?? {})
        .filter((n: any) => n.type === "VISUALIZATION")
        .map((n: any) => ({
          label: n.label,
          materialNodeId: n.materialNodeId,
          doms: n.doms.map((d: any) => d.id),
        }));
    }, await activeVariationId());

    expect(vis).toHaveLength(SAMPLE_VISUALIZATIONS.length);
    for (const expected of SAMPLE_VISUALIZATIONS) {
      const found = vis.find((v) => v.label === expected.label)!;
      expect(found).toBeDefined();
      expect(found.doms).toEqual(expected.doms.map((d) => d.id));
      // The material node id is derived from the catalog row's name + colour.
      const material = materialByRole(expected.role);
      expect(found.materialNodeId).toBe(
        materialNodeLabel(material).toLowerCase().replaceAll(/\s+/g, "-"),
      );
    }
  }, 90_000);

  it("grades the run PP–GG and totals the garments", async () => {
    const graded = await page!.evaluate((graphIdHint: string) => {
      const store = (globalThis as any).__klippelStore__;
      const graphs = store.getState().Graph?.graphs ?? {};
      const graph = graphs[graphIdHint] ?? Object.values(graphs)[0];
      return Object.values(graph?.nodes ?? {})
        .filter((n: any) => n.type === "GRADUATION")
        .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        .map((n: any) => ({ label: n.label, amount: n.amount }));
    }, await activeVariationId());

    expect(graded).toEqual(SAMPLE_GRADES);
    expect(graded.reduce((s, g) => s + (g.amount ?? 0), 0)).toBe(
      expectedTotalGarments(),
    );
  }, 90_000);

  it("totals processes + materials + logos", async () => {
    const processSubtotal = await page!.$eval(
      "#process-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    const materialSubtotal = await page!.$eval(
      "#material-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    const logoSubtotal = await page!.$eval(
      "#logo-cost-accordion-subtotal",
      (el) => (el as HTMLElement).dataset.costMoney,
    );
    const total = await page!.$eval(
      COST_ROOT,
      (el) => (el as HTMLElement).dataset.costTotal,
    );

    expect(processSubtotal).toBe(money(expectedProcessMoneyPerUnit()));
    expect(materialSubtotal).toBe(money(expectedMaterialMoneyPerUnit()));
    expect(logoSubtotal).toBe(money(expectedLogoMoneyPerUnit()));
    expect(total).toBe(money(expectedTotalMoneyPerUnit()));
    // The total is the sum of its parts — guards against double counting.
    expect(Number(total)).toBeCloseTo(
      Number(processSubtotal) + Number(materialSubtotal) + Number(logoSubtotal),
      2,
    );
  }, 90_000);
});
