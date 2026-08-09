/**
 * E2E tests for inserting a material into the **stock catalog**, driven
 * through the `insertMaterialToStock` MCP tool (which composes the
 * `addMaterial` click driver).
 *
 * The suite registers a throwaway material type first, because the "Novo
 * material" form renders its attribute block from the chosen type's latest
 * schema — without a type there is nothing to fill. The type declares one
 * attribute of each kind the driver has to dispatch on (`string`, `color`,
 * `unitValue`, `compoundValue`), so a green run is also proof that each
 * `SchemaDrivenFields` control is reachable.
 *
 * Assertions read the **live UI**, never the store:
 *   - the row lands in the stock grid (`material-row-update-<id>` mirror,
 *     rendered per row by `UpdateMaterialButton`);
 *   - `externalId` round-tripped, read back from the "Editar material"
 *     panel's own field (`update-material-external-id-<id>`) — the same
 *     open-the-edit-form-and-read-the-prefill pattern
 *     `addMaterialType.e2e.test.ts` uses (e2e-tests.md §2: assert a mirror,
 *     don't poll state from inside `waitForFunction`).
 *
 * The second `it` is the one that matters for the catalogue-import use
 * case: two colours of one fabric must share an `externalId`, which is what
 * makes the Composer's material selector group them as a single product
 * with N pickable variants (`components/selectors/Material.tsx`).
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import { addMaterialTypeTool } from "@system/modules/Materials/mcpTools/addMaterialType";
import { insertMaterialToStockTool } from "@system/modules/Materials/mcpTools/insertMaterialToStock";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const ADD_MATERIAL_TRIGGER = '[data-testid="open-add-material"]';
const STOCK_TRIGGER = '[data-testid="open-material-stock"]';

const rowUpdateTrigger = (id: string) =>
  `[data-testid="material-row-update-${id}"]`;
const updatePanel = (id: string) =>
  `[data-testid="update-material-form-${id}"]`;
const externalIdInput = (id: string) =>
  `${updatePanel(id)} [data-testid="update-material-external-id-${id}"] input`;
const externalUrlInput = (id: string) =>
  `${updatePanel(id)} [data-testid="update-material-external-url-${id}"] input`;
const imageUrlInput = (id: string) =>
  `${updatePanel(id)} [data-testid="update-material-image-url-${id}"] input`;
const imagePreview = (id: string) =>
  `${updatePanel(id)} [data-testid="update-material-image-preview-${id}"]`;

let browser: Browser | null = null;
let page: Page | null = null;

// Materials/kernelCalls.ts registers the Materiais tab asynchronously after
// the kernel boot, so wait for the label before clicking. Being on this tab
// is what mounts the `open-add-material` trigger.
const switchToMateriaisTab = async (p: Page) => {
  await p.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(p, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await p.waitForSelector(ADD_MATERIAL_TRIGGER);
};

/** Reset to an empty workspace sitting on the Materiais ribbon tab. */
const seedWorkspace = async (p: Page, workspace: string) => {
  await resetWorkspace(p, workspace);
  await p.waitForSelector("#ribbon-menu-tabs");
  await switchToMateriaisTab(p);
};

/**
 * Open the stock viewport so the DataGrid mounts. Rows only exist once the
 * grid is on screen, so every row assertion has to go through here first.
 */
const openStock = async (p: Page) => {
  await p.keyboard.press("Escape").catch(() => {});
  await p.waitForSelector(STOCK_TRIGGER);
  await p.click(STOCK_TRIGGER);
  await p.waitForSelector('[data-testid="material-stock-table"]');
};

/**
 * Assert the row exists and its supplier-facing fields round-tripped, by
 * opening the row's "Editar material" panel and reading the prefilled
 * values. When `imageURL` is given the `<img>` preview must also be
 * showing it — the store holding the string is not proof the catalogue
 * actually renders the photo (e2e-tests.md §2: assert rendered output).
 * Leaves the panel closed.
 */
const expectMaterialFields = async (
  p: Page,
  id: string,
  expected: { externalId: string; externalURL?: string; imageURL?: string },
) => {
  await p.waitForSelector(rowUpdateTrigger(id));
  await p.click(rowUpdateTrigger(id));
  await p.waitForSelector(externalIdInput(id));

  const readValue = (sel: string) =>
    p.$eval(sel, (el) => (el as HTMLInputElement).value);

  expect(await readValue(externalIdInput(id))).toBe(expected.externalId);
  if (expected.externalURL !== undefined)
    expect(await readValue(externalUrlInput(id))).toBe(expected.externalURL);
  if (expected.imageURL !== undefined) {
    expect(await readValue(imageUrlInput(id))).toBe(expected.imageURL);
    // The preview is `display: none` until a URL exists, so a visible
    // element with the right `src` is the rendered proof.
    await p.waitForSelector(`${imagePreview(id)}[src="${expected.imageURL}"]`, {
      visible: true,
    });
  }

  await p.keyboard.press("Escape");
  await p.waitForSelector(updatePanel(id), { hidden: true });
};

beforeAll(async () => {
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

beforeEach(async () => {
  if (page) await resetUIState(page);
}, 15_000);

describe("insertMaterialToStock via click (E2E)", () => {
  const WORKSPACE = "e2e-insert-material-to-stock";
  const TYPE_NAME = `malha-teste-${Math.floor(Math.random() * 1e6)}`;
  const EXTERNAL_ID = "06009";
  const PRODUCT_URL =
    "https://sajama.com.br/produtos/piquet-30-1-pv-vortex-cores-variadas/";
  const IMAGE_URL = "https://sajama.com.br/img/piquet-pv-marinho.jpg";

  beforeAll(async () => {
    await seedWorkspace(page!, WORKSPACE);
    // One attribute per kind the driver dispatches on, so the test covers
    // every branch of `setAttribute`.
    await addMaterialTypeTool.execute({
      name: TYPE_NAME,
      version: "0.0.1",
      principal: "nome",
      extra: "cor",
      stockUnit: "kilogramas6",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "cor", kind: "color" },
        { name: "largura", kind: "unitValue" },
        { name: "gramatura", kind: "compoundValue" },
      ],
    });
  }, 120_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("inserts a material carrying every attribute kind, plus link and image", async () => {
    const id = "piquet-pv-marinho";

    await insertMaterialToStockTool.execute({
      id,
      type: TYPE_NAME,
      stockAmount: 12,
      industry: "Sajama",
      externalId: EXTERNAL_ID,
      externalURL: PRODUCT_URL,
      imageURL: IMAGE_URL,
      attributes: {
        nome: "Piquet 30/1 PV Vortex",
        cor: { hex: "#1B2A4A", label: "Marinho" },
        largura: { amount: 120, unit: "centimetros7" },
        gramatura: {
          quotient: { amount: 185, unit: "gramas7" },
          dividend: { amount: 1, unit: "metrosquadrados17" },
        },
      },
    });

    await openStock(page!);
    await expectMaterialFields(page!, id, {
      externalId: EXTERNAL_ID,
      externalURL: PRODUCT_URL,
      imageURL: IMAGE_URL,
    });
  }, 120_000);

  it("groups two colours under one externalId", async () => {
    const first = "piquet-pv-limao";
    const second = "piquet-pv-canario";

    // Same product, same supplier code — only `cor` differs. This is the
    // shape a catalogue import produces, and what the Composer selector
    // collapses into one product with two colour options.
    for (const [id, label, hex] of [
      [first, "Limão", "#84E225"],
      [second, "Canário", "#F4E04D"],
    ] as const) {
      await insertMaterialToStockTool.execute({
        id,
        type: TYPE_NAME,
        stockAmount: 0,
        industry: "Sajama",
        externalId: EXTERNAL_ID,
        externalURL: PRODUCT_URL,
        imageURL: `https://sajama.com.br/img/piquet-pv-${id}.jpg`,
        attributes: {
          nome: "Piquet 30/1 PV Vortex",
          cor: { hex, label },
          largura: { amount: 120, unit: "centimetros7" },
        },
      });
    }

    await openStock(page!);
    // Same externalId + same product URL, different photo per colour —
    // exactly the shape the Sajama import produces.
    for (const id of [first, second]) {
      await expectMaterialFields(page!, id, {
        externalId: EXTERNAL_ID,
        externalURL: PRODUCT_URL,
        imageURL: `https://sajama.com.br/img/piquet-pv-${id}.jpg`,
      });
    }
  }, 180_000);
});
