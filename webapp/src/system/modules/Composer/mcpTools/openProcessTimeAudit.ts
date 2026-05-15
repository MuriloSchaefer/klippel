import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  clickProcessTimeAuditLog,
  readProcessTimeAuditText,
  waitForProcessTimeItem,
  waitForProcessTimeComputed,
} from '../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.click.puppeteer';

type OpenProcessTimeAuditInput = {
  processLabel: string;
};

export const openProcessTimeAuditTool = {
  name: 'openProcessTimeAudit',
  description:
    'Open the time-audit panel for a process by label (click flow) and return its rendered text.',
  inputSchema: {
    processLabel: z.string().describe('Label of the process row to inspect.'),
  },
  async execute({ processLabel }: OpenProcessTimeAuditInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Tempo');

    await waitForProcessTimeItem(page, processLabel);
    await waitForProcessTimeComputed(page, processLabel);
    await clickProcessTimeAuditLog(page, processLabel);
    const auditText = await readProcessTimeAuditText(page, processLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, processLabel, auditText }),
        },
      ],
    };
  },
};
