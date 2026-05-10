import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { getFocusedMaterialLabel, triggerEditMaterialFromFocused } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';


export const editFocusedMaterialTool = {
  name: 'editFocusedMaterial',
  description:
    'Press "e" to open the inline edit form on the currently focused material row. Caller must focus a material row first (focusMaterialList / cycleMaterialFocus / selectMaterialByLabel).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    const label = await getFocusedMaterialLabel(page);

    if (!label) {
      throw new Error(
        'editFocusedMaterial: no material row is focused. Focus one first.',
      );
    }

    await triggerEditMaterialFromFocused(page);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label, editing: true }) },
      ],
    };
  },
};
