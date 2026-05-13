import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { focusMaterialItem } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';
import { triggerOpenAuditLogFromFocused } from '../components/viewports/MaterialListAccordion/components/drivers/ShowMaterial.shortcut.puppeteer';
import { readMaterialAuditText } from '../components/viewports/MaterialListAccordion/components/drivers/ShowMaterial.click.puppeteer';

type OpenMaterialAuditLogShortcutInput = {
  materialLabel: string;
};

export const openMaterialAuditLogShortcutTool = {
  name: 'openMaterialAuditLogShortcut',
  description:
    'Open the cost-audit panel for a material via keyboard: focus the row and press "l". Returns its rendered text.',
  inputSchema: {
    materialLabel: z.string(),
  },
  async execute({ materialLabel }: OpenMaterialAuditLogShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await focusMaterialItem(page, materialLabel);
    await triggerOpenAuditLogFromFocused(page, materialLabel);
    const auditText = await readMaterialAuditText(page, materialLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, materialLabel, auditText }),
        },
      ],
    };
  },
};
