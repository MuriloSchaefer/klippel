/**
 * E2E tests for openMaterialAuditLog + openMaterialAuditLogShortcut. Skips if CDP unreachable.
 */
import puppeteer, { Browser, Page } from 'puppeteer-core';
import { cleanupWorkspace, resetWorkspace } from '../../../../../helpers/puppeteer/resetWorkspace';
import { closeOpenOverlays } from '../../../../../helpers/puppeteer/closeOverlays';

const CDP_PORT = Number(process.env.KLIPPEL_CDP_PORT ?? 9222);
const CDP_URL = `http://localhost:${CDP_PORT}`;

let browser: Browser | null = null;
let page: Page | null = null;

jest.mock('../../../../../../electron/main/mcp/puppeteer', () => ({
  getPage: () => {
    if (!page) throw new Error(`Klippel dev app not reachable at ${CDP_URL}.`);
    return page;
  },
}));

import { addMaterialTool } from '../addMaterial';
import { addMaterialShortcutTool } from '../addMaterialShortcut';
import { addProcessTool } from '../addProcess';
import { addProcessShortcutTool } from '../addProcessShortcut';
import { addGraduationsTool } from '../addGraduations';
import { addGraduationsShortcutTool } from '../addGraduationsShortcut';
import { deleteMaterialTool } from '../deleteMaterial';
import { deleteMaterialShortcutTool } from '../deleteMaterialShortcut';
import { deleteProcessTool } from '../deleteProcess';
import { deleteProcessShortcutTool } from '../deleteProcessShortcut';
import { deleteGraduationTool } from '../deleteGraduation';
import { deleteGraduationShortcutTool } from '../deleteGraduationShortcut';
import { linkProcessMaterialTool } from '../linkProcessMaterial';
import { linkProcessMaterialShortcutTool } from '../linkProcessMaterialShortcut';
import { openMaterialAuditLogTool } from '../openMaterialAuditLog';
import { openMaterialAuditLogShortcutTool } from '../openMaterialAuditLogShortcut';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-material-audit-log');

  await page.waitForSelector('#ribbon-menu-tabs', { timeout: 15_000 });
  await switchRibbonTabTool.execute({ label: 'Compositor' });
  await page.waitForSelector('[aria-label="create-model"]', { timeout: 15_000 });

  const id = `e2e-${uniqueSuffix()}`;
  const name = `E2E ${id}`;
  await createModelTool.execute({ name, id });
  await page.waitForSelector('[role="pointer-panel-content"] #name', {
    hidden: true,
    timeout: 10_000,
  });
  await openModelTool.execute({ modelName: name });
  await openGarmentDetailsTool.execute();
}, 60_000);

afterAll(async () => {
  if (browser) await browser.disconnect();
  cleanupWorkspace('e2e-material-audit-log');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('openMaterialAuditLog via click (E2E)', () => {
  it('opens the audit panel and reports the process consumption step', async () => {
    const materialLabel = `mat-aud-c-${uniqueSuffix()}`;
    const processLabel = `pr-aud-c-${uniqueSuffix()}`;

    try {
      await addMaterialTool.execute({
        label: materialLabel,
        type: 'malha',
        materialId: 1,
      });
      await addProcessTool.execute({ name: processLabel });
      await linkProcessMaterialTool.execute({
        processLabel,
        materialLabel,
        consumption: {
          quotient: { amount: 3, unit: 'kilogramas6' },
          dividend: { amount: 1, unit: 'unitario18' },
        },
      });

      const result = await openMaterialAuditLogTool.execute({ materialLabel });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.auditText).toContain('Auditoria de Custo');
      expect(payload.auditText).toContain(processLabel);
      // Consumption was set to 3 Kg / 1 un — audit's "Consumo original" line
      // should reflect that quotient amount.
      expect(payload.auditText).toMatch(/Consumo original:\s*3\.00/);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessTool.execute({ label: processLabel }).catch(() => {});
      await deleteMaterialTool.execute({ label: materialLabel }).catch(() => {});
    }
  }, 45_000);

  it('reports per-graduation breakdown when consumption varies per graduation', async () => {
    const suffix = uniqueSuffix();
    const materialLabel = `mat-pg-c-${suffix}`;
    const processLabel = `pr-pg-c-${suffix}`;
    const gradSmall = `S-${suffix}`;
    const gradLarge = `L-${suffix}`;

    try {
      await addGraduationsTool.execute({ names: [gradSmall, gradLarge] });
      await addMaterialTool.execute({
        label: materialLabel,
        type: 'malha',
        materialId: 1,
      });
      await addProcessTool.execute({ name: processLabel });
      await linkProcessMaterialTool.execute({
        processLabel,
        materialLabel,
        consumptionPerGrade: {
          [gradSmall]: {
            quotient: { amount: 2, unit: 'kilogramas6' },
            dividend: { amount: 1, unit: 'unitario18' },
          },
          [gradLarge]: {
            quotient: { amount: 5, unit: 'kilogramas6' },
            dividend: { amount: 1, unit: 'unitario18' },
          },
        },
      });

      const result = await openMaterialAuditLogTool.execute({ materialLabel });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.auditText).toContain(gradSmall);
      expect(payload.auditText).toContain(gradLarge);
      // The breakdown line renders `<label> (<garments> un): <amount> ...`.
      expect(payload.auditText).toMatch(new RegExp(`${gradSmall}[\\s\\S]*?\\b2\\b`));
      expect(payload.auditText).toMatch(new RegExp(`${gradLarge}[\\s\\S]*?\\b5\\b`));
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessTool.execute({ label: processLabel }).catch(() => {});
      await deleteMaterialTool.execute({ label: materialLabel }).catch(() => {});
      await deleteGraduationTool.execute({ label: gradSmall }).catch(() => {});
      await deleteGraduationTool.execute({ label: gradLarge }).catch(() => {});
    }
  }, 60_000);
});

describe('openMaterialAuditLog via shortcut (E2E)', () => {
  it('opens the audit panel via keyboard and reports the process consumption step', async () => {
    const materialLabel = `mat-aud-s-${uniqueSuffix()}`;
    const processLabel = `pr-aud-s-${uniqueSuffix()}`;

    try {
      await addMaterialShortcutTool.execute({
        label: materialLabel,
        type: 'malha',
        materialId: 1,
      });
      await addProcessShortcutTool.execute({ name: processLabel });
      await linkProcessMaterialShortcutTool.execute({
        processLabel,
        materialLabel,
      });

      const result = await openMaterialAuditLogShortcutTool.execute({
        materialLabel,
      });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.success).toBe(true);
      expect(payload.auditText).toContain('Auditoria de Custo');
      expect(payload.auditText).toContain(processLabel);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessShortcutTool.execute({ label: processLabel }).catch(() => {});
      await deleteMaterialShortcutTool.execute({ label: materialLabel }).catch(() => {});
    }
  }, 45_000);

  it('reports per-graduation breakdown via keyboard when consumption varies per graduation', async () => {
    const suffix = uniqueSuffix();
    const materialLabel = `mat-pg-s-${suffix}`;
    const processLabel = `pr-pg-s-${suffix}`;
    const gradSmall = `S-${suffix}`;
    const gradLarge = `L-${suffix}`;

    try {
      await addGraduationsShortcutTool.execute({ names: [gradSmall, gradLarge] });
      await addMaterialShortcutTool.execute({
        label: materialLabel,
        type: 'malha',
        materialId: 1,
      });
      await addProcessShortcutTool.execute({ name: processLabel });
      await linkProcessMaterialShortcutTool.execute({
        processLabel,
        materialLabel,
        consumptionPerGrade: {
          [gradSmall]: {
            quotient: { amount: 2, unit: 'kilogramas6' },
            dividend: { amount: 1, unit: 'unitario18' },
          },
          [gradLarge]: {
            quotient: { amount: 5, unit: 'kilogramas6' },
            dividend: { amount: 1, unit: 'unitario18' },
          },
        },
      });

      const result = await openMaterialAuditLogShortcutTool.execute({
        materialLabel,
      });
      const payload = JSON.parse(result.content[0].text);
      expect(payload.auditText).toContain(gradSmall);
      expect(payload.auditText).toContain(gradLarge);
      expect(payload.auditText).toMatch(new RegExp(`${gradSmall}[\\s\\S]*?\\b2\\b`));
      expect(payload.auditText).toMatch(new RegExp(`${gradLarge}[\\s\\S]*?\\b5\\b`));
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessShortcutTool.execute({ label: processLabel }).catch(() => {});
      await deleteMaterialShortcutTool.execute({ label: materialLabel }).catch(() => {});
      await deleteGraduationShortcutTool.execute({ label: gradSmall }).catch(() => {});
      await deleteGraduationShortcutTool.execute({ label: gradLarge }).catch(() => {});
    }
  }, 60_000);
});
