import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';

type SelectMaterialByLabelInput = { label: string };

export const selectMaterialByLabelTool = {
  name: 'selectMaterialByLabel',
  description:
    'Focus a material row by its visible label. Opens the Materiais accordion if needed. Matches case-insensitively, preferring exact label matches and falling back to substring matches.',
  inputSchema: {
    label: z.string().describe('Visible label of the material to focus.'),
  },
  async execute({ label }: SelectMaterialByLabelInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    const matched = await page.evaluate((needle: string) => {
      const rows = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid="material-item"]'),
      );
      const lower = needle.toLowerCase();
      const exact = rows.find(
        (r) => (r.getAttribute('data-material-label') ?? '').toLowerCase() === lower,
      );
      const partial = rows.find((r) =>
        (r.getAttribute('data-material-label') ?? '').toLowerCase().includes(lower),
      );
      const target = exact ?? partial;
      if (!target) return null;
      target.focus();
      return target.getAttribute('data-material-label');
    }, label);

    if (!matched) {
      throw new Error(`selectMaterialByLabel: no material row matches "${label}".`);
    }

    await page.waitForFunction(
      (l: string) =>
        document.activeElement?.getAttribute('data-material-label') === l,
      { timeout: 2_000 },
      matched,
    );

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, query: label, label: matched }) },
      ],
    };
  },
};
