/**
 * E2E tests for registering a new material type — click + shortcut
 * variants, driven through the `addMaterialType` / `addMaterialTypeShortcut`
 * MCP tools (which compose the matching component drivers).
 *
 * Both paths open the "Novo tipo de material" PointerContainer (click on
 * the ribbon IconButton vs. the `e` shortcut), author a fresh type with
 * two attributes, and confirm. The observable outcome we assert on is the
 * **live UI**: the new type becomes selectable in the "Editar tipo de
 * material" form's type `Select`. We match the option by its `data-value`
 * (the type name) and the `data-latest-schema` mirror added to the
 * `MenuItem` (e2e-tests.md §2 — add a mirror rather than poll state from
 * inside `waitForFunction`).
 *
 * The shortcut `it` reaches the form via the `e` binding only (no
 * `*.click.puppeteer.ts` driver on the tested path); the panel opens and
 * the type lands in the catalog exactly as the click path produces it.
 */
import puppeteer, { Browser, Page } from "puppeteer-core";
import {
  cleanupWorkspace,
  resetWorkspace,
} from "@helpers/puppeteer/resetWorkspace";
import { resetUIState } from "@helpers/puppeteer/closeOverlays";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";
import {
  UPDATE_MATERIAL_TYPE_PANEL,
  UPDATE_MATERIAL_TYPE_TRIGGER,
} from "@system/modules/Materials/components/drivers/updateMaterialType.form.puppeteer";
import { addMaterialTypeTool } from "@system/modules/Materials/mcpTools/addMaterialType";
import { addMaterialTypeShortcutTool } from "@system/modules/Materials/mcpTools/addMaterialTypeShortcut";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const ADD_TYPE_TRIGGER = '[data-testid="open-add-material-type"]';
const TYPE_SELECT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-select"] [role="combobox"]`;

let browser: Browser | null = null;
let page: Page | null = null;

// Materials/kernelCalls.ts registers the Materiais tab asynchronously
// after the kernel boot, so wait for the label before clicking. Being on
// this tab is also what activates the `e`/`r` ribbon shortcuts.
const switchToMateriaisTab = async (p: Page) => {
  await p.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(p, undefined, "Materiais");
  if (!clicked) throw new Error("Materiais ribbon tab not found after wait");
  await p.waitForSelector(ADD_TYPE_TRIGGER);
};

/** Reset to an empty workspace sitting on the Materiais ribbon tab. */
const seedWorkspace = async (p: Page, workspace: string) => {
  await resetWorkspace(p, workspace);
  await p.waitForSelector("#ribbon-menu-tabs");
  await switchToMateriaisTab(p);
};

/**
 * Assert the catalog now offers `typeName` (at `latestSchema`) by opening
 * the "Editar tipo de material" form's type `Select` and matching the
 * option's `data-value` + `data-latest-schema` mirror. Closes both the
 * listbox and the panel afterwards.
 */
const expectTypeListed = async (
  p: Page,
  typeName: string,
  latestSchema: string,
) => {
  await p.keyboard.press("Escape").catch(() => {});
  await p.click(UPDATE_MATERIAL_TYPE_TRIGGER);
  await p.waitForSelector(`[role="pointer-panel-content"] ${UPDATE_MATERIAL_TYPE_PANEL}`);
  await p.click(TYPE_SELECT);
  await p.waitForSelector(
    `ul[role="listbox"] li[role="option"][data-value="${typeName}"][data-latest-schema="${latestSchema}"]`,
  );
  await p.keyboard.press("Escape"); // close the listbox
  await p.keyboard.press("Escape"); // close the panel
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

describe("addMaterialType via click (E2E)", () => {
  const WORKSPACE = "e2e-add-material-type-click";
  const TYPE_NAME = `tipo-click-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    await seedWorkspace(page!, WORKSPACE);
  }, 90_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("registers a new type that becomes selectable for editing", async () => {
    await addMaterialTypeTool.execute({
      name: TYPE_NAME,
      version: "0.0.1",
      principal: "nome",
      extra: "peso",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
      ],
    });

    await expectTypeListed(page!, TYPE_NAME, "0.0.1");
  }, 90_000);
});

describe("addMaterialType via shortcut (E2E)", () => {
  const WORKSPACE = "e2e-add-material-type-shortcut";
  const TYPE_NAME = `tipo-sc-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    await seedWorkspace(page!, WORKSPACE);
  }, 90_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("opens via `e` and registers a new selectable type", async () => {
    // `e` must route to the addType binding, so focus must not already be
    // in a text input — `beforeEach`'s resetUIState blurs it.
    await addMaterialTypeShortcutTool.execute({
      name: TYPE_NAME,
      version: "0.0.1",
      principal: "nome",
      extra: "peso",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
      ],
    });

    await expectTypeListed(page!, TYPE_NAME, "0.0.1");
  }, 90_000);
});
