import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { getFocusedMaterialListTarget, triggerFocusMaterialList } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';

export const focusMaterialListTool = {
  name: 'focusMaterialList',
  description:
    'Press Ctrl+M to open the Materiais accordion and move keyboard focus to the first material row (or the add-material button if the list is empty).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await triggerFocusMaterialList(page);

    const focused = await getFocusedMaterialListTarget(page);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, focused }) },
      ],
    };
  },
};
