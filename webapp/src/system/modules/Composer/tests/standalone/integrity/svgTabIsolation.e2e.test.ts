/**
 * E2E — each viewport tab renders its own SVG variation.
 *
 * Reproduces a user-reported bug: with two tabs open on the same model, the tab
 * showing the untouched artwork inherited the *other* tab's colours as soon as
 * you visited that tab and came back.
 *
 *   1. Open a model, upload the artwork, save it.
 *   2. Open the same model again — a second, independent variation.
 *   3. Colour an element through a visualization in tab 1.
 *   4. Tab 2 must still show the source colour, before and after visiting tab 1.
 *
 * Three angles, weakest to strongest: one tab proxied and the other not; a
 * *different* visualization in each tab, where switching has to swap red for blue
 * (a stale render is then a wrong colour, not a missing one, and "both tabs
 * blank" cannot pass); and a proxy removed inside one tab.
 *
 * Two defects produced it, and both are guarded here:
 *
 * - `ViewportLoader` created the viewport component with no `key`, so two tabs of
 *   the same type shared one fiber — and therefore one set of `useMemo` caches.
 *   The SVG editor memoises its parsed document on the content *string*, and two
 *   variations of one model hold equal strings, so the second tab was handed the
 *   first tab's already-mutated DOM.
 * - `renderPreview` painted proxies onto that parsed document without ever
 *   putting back what a previous pass had written, so the paint accumulated.
 *   The last `it` pins that half on its own: removing a visualization must
 *   restore the element's source colour.
 *
 * `integrity` rather than `functionality`: nothing here asks whether
 * visualizations work (that is `editVisualization.e2e.test.ts`) — it asserts the
 * invariant that one instance's rendering cannot reach another's, and that the
 * paint is reversible whatever order the passes ran in.
 *
 * Everything is asserted on **the proxy as applied in the viewport** — the
 * rendered `#svg-editor` subtree — because that is where the bug lived: the
 * store held the right proxies for both instances the whole time and only the
 * painting leaked. A state-level assertion would have passed throughout.
 *
 * Two things make those assertions precise:
 *
 * - The fixture's `rect-border` ships `fill="none"`, so both states are exact
 *   attribute selectors: `[fill="none"]` is the source artwork and
 *   `[fill="#ff0000"]` is the proxied one. A leak is the wrong one of the two,
 *   never an ambiguous absence.
 * - Every tab's editor carries the same `#svg-editor` id, so each selector also
 *   names the variation via the `data-variation-id` mirror. "Tab 2 shows the
 *   source colour" then cannot be satisfied by tab 1's editor happening to be in
 *   the DOM.
 */
import * as path from 'path';
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { resetUIState } from '@helpers/puppeteer/closeOverlays';
import { seedMaterialsCatalog } from '@helpers/puppeteer/seedMaterialsCatalog';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;
const TEST_WORKSPACE = 'e2e-svg-tab-isolation';

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { addVisualizationTool } from '@system/modules/Composer/mcpTools/addVisualization';
import { deleteVisualizationTool } from '@system/modules/Composer/mcpTools/deleteVisualization';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchViewTool } from '@system/modules/Composer/mcpTools/switchView';
import { uploadVariationSVGTool } from '@system/modules/Composer/mcpTools/uploadVariationSVG';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { switchViewportTool } from '@kernel/modules/Layout/mcpTools/switchViewport';
import {
  openPointerPanel,
  confirmPointerPanel,
} from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';

const FIXTURE_PATH = path.resolve(__dirname, '../../fixtures/sample.svg');

/**
 * Two materials from the seeded catalog, with the colours
 * `editVisualization.e2e.test.ts` already pins to these catalog rows. A proxy
 * writes the material's colour straight onto the element, so the hex doubles as
 * the selector value and the `rgb()` form as the computed-style expectation.
 */
const RED = {
  materialLabel: 'red-material',
  materialId: 5,
  fill: '#ff0000',
  computed: 'rgb(255, 0, 0)',
} as const;
const BLUE = {
  materialLabel: 'blue-material',
  materialId: 3,
  fill: '#0000ff',
  computed: 'rgb(0, 0, 255)',
} as const;

/** What the fixture ships on `rect-border`, i.e. "no proxy applied". */
const SOURCE_FILL = 'none';

/**
 * `rect-border` as rendered **in the mounted viewport**, for a named variation.
 *
 * Every tab's editor carries the same `#svg-editor` id, so the assertion has to
 * name the variation (`data-variation-id`) or it cannot distinguish "tab 2 shows
 * the source colour" from "some editor somewhere does". Scoped under
 * `[role="viewport-content"]` so it is the live viewport being asserted, not a
 * detached or off-screen tree — the rendered viewport is the whole point of the
 * invariant, since state was correct all along and only the painting leaked.
 *
 * The fill match is case-insensitive (`i`): the colour comes from the material's
 * `cor` attribute in the imported catalog, and asserting a hex *casing* would
 * couple this test to the spreadsheet rather than to the colour.
 */
const editorRect = (variationId: string, fill: string) =>
  `[role="viewport-content"] #svg-editor[data-variation-id="${variationId}"]` +
  ` #rect-border[fill="${fill}" i]`;

/** The variation whose editor is currently mounted in the viewport. */
const mountedVariationId = async (p: Page) =>
  p.$eval(
    '[role="viewport-content"] #svg-editor',
    (el) => (el as SVGElement).dataset.variationId ?? '',
  );

/**
 * How many model tabs are open — the home and add-viewport tabs excluded, so it
 * counts exactly what `switchViewport`'s 1-based index counts.
 *
 * Each `it` leaves its tabs open (closing them would need waits of its own, and
 * they are harmless), so a test reads this *before* opening anything and indexes
 * its own tabs from there instead of assuming it ran first. New tabs append, and
 * no test here creates a budget, so none of them are re-ordered into a tab group.
 */
const openModelTabCount = () =>
  page!.$$eval('[role="viewport-tabs"] [role="tab"]', (tabs) =>
    tabs.filter((t) => t.id !== 'home' && t.id !== 'new-viewport').length,
  );

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const waitForCreateFormClosed = async (p: Page) => {
  await p.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
  });
};

/**
 * The colour the browser actually paints, read from the mounted viewport. The
 * attribute selectors above prove what the proxy pass *wrote*; this proves it
 * won — the pass also strips the element's inline `style`, and without that the
 * attribute would be correct while the artwork still looked unchanged.
 */
const readSvgElementFill = async (p: Page, elementId: string) =>
  p.$eval(
    `[role="viewport-content"] #svg-editor #${elementId}`,
    (el) => window.getComputedStyle(el).fill,
  );

/** Open `modelName` in a new tab and put that tab into SVG view. */
const openModelInSVGView = async (modelName: string) => {
  await openModelTool.execute({ modelName });
  await switchViewTool.execute({ view: 'svg' });
  await page!.waitForSelector('#composer-active-view[data-active-view="svg"]');
};

/**
 * Create a model, upload the fixture artwork and commit it, so a second `open`
 * of the same model streams the artwork into its own variation. Without the
 * commit the second tab would come up on the empty state instead.
 */
const createModelWithArtwork = async () => {
  const id = `e2e-${uniqueSuffix()}`;
  const name = `Tab Isolation ${id}`;

  await createModelTool.execute({ name, id });
  await waitForCreateFormClosed(page!);

  await openModelInSVGView(name);
  await page!.waitForSelector('[data-testid="svg-empty-state"]');
  await uploadVariationSVGTool.execute({ filePath: FIXTURE_PATH });
  const variationId = await mountedVariationId(page!);
  await page!.waitForSelector(editorRect(variationId, SOURCE_FILL));

  await openPointerPanel(page!, '#composer-save-model', 'save-model-form');
  await page!.type(
    '[data-testid="save-model-form"] [data-testid="save-model-message"] textarea:not([readonly])',
    'artwork',
  );
  await confirmPointerPanel(page!);

  return { name, variationId };
};

/**
 * Colour `rect-border` in the **active** tab, through a visualization bound to
 * `colour`'s material, and wait until the proxy is applied in `variationId`'s
 * viewport.
 *
 * Materials and visualizations are per-variation, so each tab adds its own —
 * they are independent even when both are named the same.
 */
const colourRect = async (
  visualizationName: string,
  variationId: string,
  colour: typeof RED | typeof BLUE,
) => {
  await addMaterialTool.execute({
    label: colour.materialLabel,
    type: 'malha',
    materialId: colour.materialId,
  });
  await openGarmentDetailsTool.execute();
  await addVisualizationTool.execute({
    name: visualizationName,
    materialNodeLabel: colour.materialLabel,
    doms: [{ id: 'rect-border', fill: true }],
  });
  await page!.waitForSelector(editorRect(variationId, colour.fill));
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');

  await resetWorkspace(page, TEST_WORKSPACE);
  await page.waitForSelector('#ribbon-menu-tabs');
  await seedMaterialsCatalog(page);
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');
}, 90_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(TEST_WORKSPACE);
});

beforeEach(async () => {
  if (!page) return;
  await resetUIState(page!);
}, 15_000);

describe('SVG rendering is per viewport tab', () => {
  it("keeps one tab's visualization out of another tab's rendering", async () => {
    const base = await openModelTabCount();
    const { name, variationId: firstVariation } = await createModelWithArtwork();
    const [firstTab, secondTab] = [base + 1, base + 2];

    // A second variation of the same model, in its own tab. Its artwork is the
    // same bytes as tab 1's — which is precisely what used to make the two share
    // a parsed document.
    await openModelInSVGView(name);
    const secondVariation = await mountedVariationId(page!);
    // Each tab drives its own variation: the premise of everything below.
    expect(secondVariation).not.toBe(firstVariation);
    await page!.waitForSelector(editorRect(secondVariation, SOURCE_FILL));

    // Tab 1 gets the visualization. The wait inside `colourRect` is the positive
    // half of the invariant: the proxy is applied in *this* viewport.
    await switchViewportTool.execute({ viewportIndex: firstTab });
    await page!.waitForSelector(editorRect(firstVariation, SOURCE_FILL));
    await colourRect('rect-vis', firstVariation, RED);
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(RED.computed);

    // The regression: returning to tab 2 after visiting the coloured tab. Naming
    // the variation is what makes this an assertion rather than a coincidence —
    // it can only pass with the second tab's own editor mounted and unproxied.
    // This used to show tab 1's red.
    await switchViewportTool.execute({ viewportIndex: secondTab });
    await page!.waitForSelector(editorRect(secondVariation, SOURCE_FILL));

    // …and tab 1 still has its own colour, so isolation did not simply blank
    // both tabs.
    await switchViewportTool.execute({ viewportIndex: firstTab });
    await page!.waitForSelector(editorRect(firstVariation, RED.fill));
  }, 180_000);

  it('swaps one tab\'s proxies for the other\'s when the tab changes', async () => {
    const base = await openModelTabCount();
    const { name, variationId: firstVariation } = await createModelWithArtwork();
    const [firstTab, secondTab] = [base + 1, base + 2];

    await openModelInSVGView(name);
    const secondVariation = await mountedVariationId(page!);
    expect(secondVariation).not.toBe(firstVariation);

    // Each tab gets its **own** visualization, on the same element, in a
    // different colour. Sharper than the presence/absence case above: switching
    // has to *replace* one paint with another, so a stale render is a wrong
    // colour rather than a missing one — and "both tabs blank" cannot pass here.
    await colourRect('tab2-vis', secondVariation, BLUE);

    await switchViewportTool.execute({ viewportIndex: firstTab });
    // Tab 1 is untouched by tab 2's visualization, before it gets its own.
    await page!.waitForSelector(editorRect(firstVariation, SOURCE_FILL));
    await colourRect('tab1-vis', firstVariation, RED);

    // Switch back and forth: each tab paints its own colour, and the computed
    // style confirms the browser really renders it — the proxy pass strips the
    // element's inline `style` so the attribute wins, and a failure there would
    // leave the attribute correct while the artwork still looked unchanged.
    await switchViewportTool.execute({ viewportIndex: secondTab });
    await page!.waitForSelector(editorRect(secondVariation, BLUE.fill));
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(BLUE.computed);

    await switchViewportTool.execute({ viewportIndex: firstTab });
    await page!.waitForSelector(editorRect(firstVariation, RED.fill));
    expect(await readSvgElementFill(page!, 'rect-border')).toBe(RED.computed);

    // Once more, so the assertion covers a repeated switch rather than a single
    // one — the leak reproduced on the *return* trip.
    await switchViewportTool.execute({ viewportIndex: secondTab });
    await page!.waitForSelector(editorRect(secondVariation, BLUE.fill));
  }, 180_000);

  it('restores the source colour when the visualization is removed', async () => {
    const { variationId } = await createModelWithArtwork();
    await colourRect('removable-vis', variationId, RED);

    // Removing a proxy has to put back what the source said, or the colour
    // outlives the visualization that asked for it until the content itself
    // changes. `renderPreview` gets that by painting each pass onto a fresh copy
    // of the parsed document rather than accumulating onto one — this `it` is
    // what pins that half of the fix, independently of the tab-keying above.
    await deleteVisualizationTool.execute({ label: 'removable-vis' });
    await page!.waitForSelector(editorRect(variationId, SOURCE_FILL));
  }, 180_000);
});
