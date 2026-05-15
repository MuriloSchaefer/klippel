import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  focusProcessTimeItem,
  triggerOpenProcessTimeAuditFromFocused,
} from '../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.shortcut.puppeteer';
import {
  readProcessTimeAuditText,
  waitForProcessTimeComputed,
} from '../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.click.puppeteer';

type OpenProcessTimeAuditShortcutInput = {
  processLabel: string;
};

export const openProcessTimeAuditShortcutTool = {
  name: 'openProcessTimeAuditShortcut',
  description:
    'Open the time-audit panel for a process via keyboard: focus the row and press "l". Returns the audit panel text.',
  inputSchema: {
    processLabel: z.string(),
  },
  async execute({ processLabel }: OpenProcessTimeAuditShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Tempo');

    await focusProcessTimeItem(page, processLabel);
    await waitForProcessTimeComputed(page, processLabel);
    await triggerOpenProcessTimeAuditFromFocused(page, processLabel);
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
