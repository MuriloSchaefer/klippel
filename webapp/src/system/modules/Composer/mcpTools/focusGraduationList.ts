import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { getFocusedGraduationListTarget, triggerFocusGraduationList } from '../components/viewports/GraduationListAccordion/drivers/GraduationItem.shortcut.puppeteer';

export const focusGraduationListTool = {
  name: 'focusGraduationList',
  description:
    'Press Ctrl+Alt+G to open the Graduações accordion and move focus to the first graduation row (or the add-graduation button if empty).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await triggerFocusGraduationList(page);

    const focused = await getFocusedGraduationListTarget(page);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, focused }) },
      ],
    };
  },
};
