import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedProcessListTarget,
  triggerFocusProcessList,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';

export const focusProcessListTool = {
  name: 'focusProcessList',
  description:
    'Press Ctrl+Alt+R to open the Processos accordion and move keyboard focus to the first process row (or the add-process button if the list is empty).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await triggerFocusProcessList(page);

    const focused = await getFocusedProcessListTarget(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, focused }),
        },
      ],
    };
  },
};
