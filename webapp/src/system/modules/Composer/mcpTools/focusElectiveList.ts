import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedElectiveListTarget,
  triggerFocusElectiveList,
} from '../components/viewports/ElectiveListAccordion/drivers/ElectiveItem.shortcut.puppeteer';

export const focusElectiveListTool = {
  name: 'focusElectiveList',
  description:
    'Press Ctrl+Alt+E to open the Eletivos accordion and move keyboard focus to the first elective row (or the add-elective button if the list is empty).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await triggerFocusElectiveList(page);

    const focused = await getFocusedElectiveListTarget(page);

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
