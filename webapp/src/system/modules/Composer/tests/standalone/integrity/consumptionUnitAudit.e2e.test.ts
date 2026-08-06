/**
 * E2E integrity test for the material-type consumption unit.
 *
 * Invariant: the unit a material's usage is reported in follows its
 * **type's** consumption unit, and the cost audit stays internally
 * consistent when it does — the per-unit figure, the graduation total,
 * and the stock equivalent must all agree.
 *
 * This is an `integrity` test rather than `functionality` because what
 * it pins is a derived-value relationship that must hold regardless of
 * the path taken to it: the consumption unit is read from the type's
 * *latest* schema, so a material pinned to an older `schemaVersion` —
 * never re-saved, never touched after the type was edited — must still
 * report in the new unit. See
 * `docs/changes/2026-08-02-e9465a-material-consumption-unit.md`.
 *
 * Skips if CDP unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '@helpers/puppeteer/resetWorkspace';
import { closeOpenOverlays } from '@helpers/puppeteer/closeOverlays';
import { seedMaterialsCatalog } from '@helpers/puppeteer/seedMaterialsCatalog';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addMaterialTool } from '@system/modules/Composer/mcpTools/addMaterial';
import { addProcessTool } from '@system/modules/Composer/mcpTools/addProcess';
import { addGraduationsTool } from '@system/modules/Composer/mcpTools/addGraduations';
import { editGraduationTool } from '@system/modules/Composer/mcpTools/editGraduation';
import { linkProcessMaterialTool } from '@system/modules/Composer/mcpTools/linkProcessMaterial';
import { openMaterialAuditLogTool } from '@system/modules/Composer/mcpTools/openMaterialAuditLog';
import { openGarmentDetailsTool } from '@system/modules/Composer/mcpTools/openGarmentDetails';
import { createModelTool } from '@system/modules/Composer/mcpTools/createModel';
import { openModelTool } from '@system/modules/Composer/mcpTools/openModel';
import { switchRibbonTabTool } from '@kernel/modules/Layout/mcpTools/switchRibbonTab';
import { updateMaterialTypeTool } from '@system/modules/Materials/mcpTools/updateMaterialType';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { waitForMaterialCostUnit } from '@system/modules/Composer/components/viewports/MaterialListAccordion/components/drivers/ShowMaterial.click.puppeteer';

const WORKSPACE = 'e2e-consumption-unit-audit';

/**
 * Fixture facts (`public/materials/materials.xlsx`): material id 1 is a
 * `malha` stocked in `kilogramas6` carrying a `gramatura` attribute. The
 * conversion graph models `m²/un → Kg/un` through that attribute, so
 * declaring m² as the consumption unit is fully convertible back to
 * stock — which is what lets this test assert on the equivalent.
 */
const MALHA_STOCK_UNIT = 'kilogramas6';
const SQUARE_METRES = 'metrosquadrados17';

/**
 * Consumption is authored in m² because the conversion graph models
 * `m²/un → Kg/un` and *not* its inverse. Entering it in Kg would leave
 * the baseline unconvertible and the whole audit reading 0.
 */
const CONSUMPTION_M2 = 2.5;
/** Graduations are created with quantity 0; totals need real counts. */
const GARMENTS_SMALL = 10;
const GARMENTS_LARGE = 20;

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

/** `Consumo por unidade:` → the numeric figure and its unit abbreviation. */
const readPerUnit = (auditText: string): { amount: number; unit: string } => {
  const match = auditText.match(/Consumo por unidade:\s*([\d.]+)\s*(\S+)\s*\//);
  if (!match) {
    throw new Error(`Could not find "Consumo por unidade" in audit text:\n${auditText}`);
  }
  return { amount: Number(match[1]), unit: match[2] };
};

/** `Total considerando graduações:` → the aggregate figure. */
const readTotal = (auditText: string): number => {
  const match = auditText.match(/Total considerando graduações:\s*([\d.]+)/);
  if (!match) {
    throw new Error(`Could not find "Total considerando graduações" in audit text:\n${auditText}`);
  }
  return Number(match[1]);
};

const openAudit = async (materialLabel: string): Promise<string> => {
  const result = await openMaterialAuditLogTool.execute({ materialLabel });
  const payload = JSON.parse(result.content[0].text);
  expect(payload.success).toBe(true);
  return payload.auditText as string;
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, WORKSPACE);

  await page.waitForSelector('#ribbon-menu-tabs');
  await seedMaterialsCatalog(page);
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]');

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page.waitForSelector('[role="pointer-panel-content"] #name', { hidden: true });
  await openModelTool.execute({ modelName: name });
  await openGarmentDetailsTool.execute();
}, 120_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace(WORKSPACE);
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('material consumption unit — audit integrity (E2E)', () => {
  it('retargets usage to the type consumption unit and keeps the audit self-consistent', async () => {
    const suffix = uniqueSuffix();
    const materialLabel = `mat-cu-${suffix}`;
    const processLabel = `pr-cu-${suffix}`;
    const gradSmall = `S-${suffix}`;
    const gradLarge = `L-${suffix}`;

    try {
      await addGraduationsTool.execute({ names: [gradSmall, gradLarge] });
      // Graduations land with quantity 0, which would make every total
      // zero and the integrity ratio below a division by zero.
      await editGraduationTool.execute({
        label: gradSmall,
        changes: { amount: GARMENTS_SMALL },
      });
      await editGraduationTool.execute({
        label: gradLarge,
        changes: { amount: GARMENTS_LARGE },
      });

      await addMaterialTool.execute({ label: materialLabel, type: 'malha', materialId: 1 });
      await addProcessTool.execute({ name: processLabel });
      await linkProcessMaterialTool.execute({
        processLabel,
        materialLabel,
        consumption: {
          quotient: { amount: CONSUMPTION_M2, unit: SQUARE_METRES },
          dividend: { amount: 1, unit: 'unitario18' },
        },
      });

      // ---- Baseline: the type declares no consumption unit, so usage
      // is reported in the material's stock unit.
      await expandAccordion(page!, 'Materiais');
      await waitForMaterialCostUnit(page!, materialLabel, MALHA_STOCK_UNIT);

      const before = await openAudit(materialLabel);
      expect(readPerUnit(before).unit).toBe('Kg');
      // Nothing to convert back to, so no equivalent line is offered.
      expect(before).not.toContain('Unidade de consumo');
      await closeOpenOverlays(page!);

      // ---- Declare m² as the consumption unit on the type. The
      // material stays pinned to the schema version it was created
      // with; the unit is a type-level setting read from the latest
      // schema, so the retarget must happen without touching the row.
      await switchRibbonTabTool.execute({ label: 'Materiais' });
      await updateMaterialTypeTool.execute({
        typeName: 'malha',
        version: '0.0.2',
        consumptionUnit: SQUARE_METRES,
      });
      await switchRibbonTabTool.execute({ label: 'Compositor' });

      await expandAccordion(page!, 'Materiais');
      await waitForMaterialCostUnit(page!, materialLabel, SQUARE_METRES);

      // ---- Invariants on the retargeted audit.
      const after = await openAudit(materialLabel);

      const perUnit = readPerUnit(after);
      expect(perUnit.unit).toBe('m²');
      expect(perUnit.amount).toBeGreaterThan(0);

      // The audit names the new target and offers the stock-unit
      // equivalent, since m² → Kg is modelled through `gramatura`.
      expect(after).toContain('Unidade de consumo');
      expect(after).toMatch(/≈\s*[\d.]+\s*Kg/);

      // Total must be the per-unit figure scaled by the garment count,
      // in the same unit — the relationship the consumption unit must
      // not disturb.
      const total = readTotal(after);
      expect(total).toBeCloseTo(perUnit.amount * (GARMENTS_SMALL + GARMENTS_LARGE), 2);
    } finally {
      await closeOpenOverlays(page!).catch(() => {});
    }
  }, 180_000);
});
