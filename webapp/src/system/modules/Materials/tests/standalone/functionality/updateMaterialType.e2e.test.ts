/**
 * E2E tests for registering a new *version* of an existing material type
 * — click + shortcut variants, driven through the `updateMaterialType` /
 * `updateMaterialTypeShortcut` MCP tools (which compose the matching
 * component drivers).
 *
 * Schema versions are immutable, so "update" derives a successor version
 * (see `UpdateMaterialTypeSection`). Each describe seeds a base type at
 * `0.0.1` (via the click add tool — setup, not the path under test), then
 * the `it` body opens the "Editar tipo de material" PointerContainer
 * (click on the ribbon IconButton vs. the `r` shortcut), picks the type,
 * adds a `cor:color` attribute, and saves as `0.0.2`.
 *
 * The observable outcome is the **live UI**: the type's option in the
 * edit form's `Select` advances to the new version, asserted via the
 * `data-latest-schema` mirror on the `MenuItem` (e2e-tests.md §2 — add a
 * mirror rather than poll state from inside `waitForFunction`).
 *
 * The shortcut `it` reaches the form via the `r` binding only (no
 * `*.click.puppeteer.ts` driver on the tested path).
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
import { updateMaterialTypeTool } from "@system/modules/Materials/mcpTools/updateMaterialType";
import { updateMaterialTypeShortcutTool } from "@system/modules/Materials/mcpTools/updateMaterialTypeShortcut";

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

const ADD_TYPE_TRIGGER = '[data-testid="open-add-material-type"]';
const TYPE_SELECT = `${UPDATE_MATERIAL_TYPE_PANEL} [data-testid="update-material-type-select"] [role="combobox"]`;

let browser: Browser | null = null;
let page: Page | null = null;

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

/**
 * Reset to an empty workspace on the Materiais tab and author a base type
 * at `0.0.1` so the update flow has something to derive a successor from.
 */
const seedWorkspaceWithBaseType = async (
  p: Page,
  workspace: string,
  typeName: string,
) => {
  await resetWorkspace(p, workspace);
  await p.waitForSelector("#ribbon-menu-tabs");
  await switchToMateriaisTab(p);
  await addMaterialTypeTool.execute({
    name: typeName,
    version: "0.0.1",
    principal: "nome",
    extra: "peso",
    attributes: [
      { name: "nome", kind: "string" },
      { name: "peso", kind: "number" },
    ],
  });
  await resetUIState(p);
};

/**
 * Assert the edit form's type `Select` shows `typeName` at `latestSchema`
 * via the `data-latest-schema` mirror. Closes the listbox + panel after.
 */
const expectTypeAtVersion = async (
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

describe("updateMaterialType via click (E2E)", () => {
  const WORKSPACE = "e2e-update-material-type-click";
  const TYPE_NAME = `tipo-upd-click-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    await seedWorkspaceWithBaseType(page!, WORKSPACE, TYPE_NAME);
  }, 120_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("registers a successor version that advances the type's latestSchema", async () => {
    // Precondition: the base type is at 0.0.1.
    await expectTypeAtVersion(page!, TYPE_NAME, "0.0.1");

    await updateMaterialTypeTool.execute({
      typeName: TYPE_NAME,
      version: "0.0.2",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
        { name: "cor", kind: "color" },
      ],
    });

    await expectTypeAtVersion(page!, TYPE_NAME, "0.0.2");
  }, 120_000);
});

describe("updateMaterialType via shortcut (E2E)", () => {
  const WORKSPACE = "e2e-update-material-type-shortcut";
  const TYPE_NAME = `tipo-upd-sc-${Math.floor(Math.random() * 1e6)}`;

  beforeAll(async () => {
    await seedWorkspaceWithBaseType(page!, WORKSPACE, TYPE_NAME);
  }, 120_000);

  afterAll(() => cleanupWorkspace(WORKSPACE));

  it("opens via `r` and registers a successor version", async () => {
    await expectTypeAtVersion(page!, TYPE_NAME, "0.0.1");

    // `r` must route to the updateType binding, so focus must not already
    // be in a text input — `beforeEach`'s resetUIState blurs it.
    await updateMaterialTypeShortcutTool.execute({
      typeName: TYPE_NAME,
      version: "0.0.2",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
        { name: "cor", kind: "color" },
      ],
    });

    await expectTypeAtVersion(page!, TYPE_NAME, "0.0.2");
  }, 120_000);
});
