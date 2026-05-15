import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedProcessTimeTarget,
  triggerFocusProcessTimeList,
} from '../components/viewports/ProcessTimeAccordion/drivers/ProcessTimeItem.shortcut.puppeteer';

export const focusProcessTimeListTool = {
  name: 'focusProcessTimeList',
  description:
    'Press Ctrl+Alt+T to open the Tempo accordion and move keyboard focus to the first process-time row.',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await triggerFocusProcessTimeList(page);

    const focused = await getFocusedProcessTimeTarget(page);

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
