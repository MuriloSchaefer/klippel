import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { waitForMaterialItem } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.click.puppeteer';
import {
  clickMaterialAuditLog,
  readMaterialAuditText,
} from '../components/viewports/MaterialListAccordion/components/drivers/ShowMaterial.click.puppeteer';

type OpenMaterialAuditLogInput = {
  materialLabel: string;
};

export const openMaterialAuditLogTool = {
  name: 'openMaterialAuditLog',
  description:
    'Open the cost-audit panel for a material by label (click flow) and return its rendered text.',
  inputSchema: {
    materialLabel: z.string().describe('Label of the material node to inspect.'),
  },
  async execute({ materialLabel }: OpenMaterialAuditLogInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await waitForMaterialItem(page, materialLabel);
    await clickMaterialAuditLog(page, materialLabel);
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
