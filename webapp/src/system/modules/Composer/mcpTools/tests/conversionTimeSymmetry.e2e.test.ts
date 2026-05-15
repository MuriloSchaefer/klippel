/**
 * E2E regression test for time-conversion symmetry.
 *
 * `8 h / 100 un` and `100 un / 8 h` describe the same physical rate (8 hours
 * to produce 100 units), so the time audit must report the same min/un result
 * for both. It currently does not — see
 * docs/changes/2026-05-14-conversion-stale-compound-vars.md — because
 * traceConversion freezes quantidadeQuociente/quantidadeDividendo to the
 * original input across a multi-step path. This test pins the expected
 * behaviour end to end and should pass once that bug is fixed.
 *
 * Skips if CDP unreachable.
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

import { addProcessTool } from '../addProcess';
import { editProcessTool } from '../editProcess';
import { deleteProcessTool } from '../deleteProcess';
import { openProcessTimeAuditTool } from '../openProcessTimeAudit';
import { openGarmentDetailsTool } from '../openGarmentDetails';
import { createModelTool } from '../createModel';
import { openModelTool } from '../openModel';
import { switchRibbonTabTool } from '../../../../../kernel/modules/Layout/mcpTools/switchRibbonTab';

const HORA_UNIT = 'hora250';

const uniqueSuffix = () => `${Math.floor(Math.random() * 1e6)}`.slice(0, 5);

const readMinutesPerUnit = (auditText: string): number => {
  const match = auditText.match(/Tempo por unidade:\s*([\d.]+)/);
  if (!match) {
    throw new Error(`Could not find "Tempo por unidade" in audit text:\n${auditText}`);
  }
  return Number(match[1]);
};

beforeAll(async () => {
  browser = await puppeteer.connect({ browserURL: CDP_URL, defaultViewport: null });
  const pages = await browser.pages();
  page = pages.find((p) => p.url().startsWith('http://localhost:')) ?? pages[0];
  if (!page) throw new Error('No renderer page found in Electron');
  await resetWorkspace(page, 'e2e-conversion-time-symmetry');

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
  cleanupWorkspace('e2e-conversion-time-symmetry');
});

beforeEach(async () => {
  if (page) await closeOpenOverlays(page);
}, 15_000);

describe('time conversion symmetry (E2E)', () => {
  it('reports the same min/un for "8 h / 100 un" and "100 un / 8 h"', async () => {
    const hPerUn = `sym-hun-${uniqueSuffix()}`; // 8 h / 100 un
    const unPerH = `sym-unh-${uniqueSuffix()}`; // 100 un / 8 h

    try {
      // Each add/edit step opens a PointerContainer form; closing overlays
      // between steps keeps a slow-closing panel from leaking into the next
      // operation and blocking the audit panel from opening.
      // Process A: 8 h / 100 un. Changing the quotient unit to hora snaps the
      // compound to h/un, then amounts are set to 8 and 100.
      await addProcessTool.execute({ name: hPerUn });
      await closeOpenOverlays(page!);
      await editProcessTool.execute({
        label: hPerUn,
        costTime: {
          quotientUnit: HORA_UNIT,
          quotientAmount: 8,
          dividendAmount: 100,
        },
      });
      await closeOpenOverlays(page!);

      // Process B: 100 un / 8 h. Changing the dividend unit to hora keeps the
      // compound as un/h, then amounts are set to 100 and 8.
      await addProcessTool.execute({ name: unPerH });
      await closeOpenOverlays(page!);
      await editProcessTool.execute({
        label: unPerH,
        costTime: {
          dividendUnit: HORA_UNIT,
          quotientAmount: 100,
          dividendAmount: 8,
        },
      });
      await closeOpenOverlays(page!);

      const auditA = JSON.parse(
        (await openProcessTimeAuditTool.execute({ processLabel: hPerUn })).content[0].text,
      );
      await closeOpenOverlays(page!);
      const auditB = JSON.parse(
        (await openProcessTimeAuditTool.execute({ processLabel: unPerH })).content[0].text,
      );

      expect(auditA.success).toBe(true);
      expect(auditB.success).toBe(true);

      const minutesA = readMinutesPerUnit(auditA.auditText);
      const minutesB = readMinutesPerUnit(auditB.auditText);

      // 8 hours for 100 units = 480 min / 100 un = 4.8 min/un, both ways round.
      expect(minutesA).toBeCloseTo(4.8, 4);
      expect(minutesB).toBeCloseTo(4.8, 4);
      expect(minutesB).toBeCloseTo(minutesA, 4);
    } finally {
      await closeOpenOverlays(page!);
      await deleteProcessTool.execute({ label: hPerUn }).catch(() => {});
      await deleteProcessTool.execute({ label: unPerH }).catch(() => {});
    }
  }, 90_000);
});
