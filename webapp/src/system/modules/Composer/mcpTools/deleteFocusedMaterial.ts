import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  getFocusedMaterialLabel,
  triggerDeleteMaterialFromFocused,
} from '../components/viewports/MaterialListAccordion/components/MaterialItem.shortcut.puppeteer';
import { waitForMaterialItemRemoved } from '../components/viewports/MaterialListAccordion/components/MaterialItem.click.puppeteer';

export const deleteFocusedMaterialTool = {
  name: 'deleteFocusedMaterial',
  description:
    'Press "d" to delete the currently focused material row. Caller must focus a material row first (focusMaterialList / cycleMaterialFocus / selectMaterialByLabel).',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();

    const label = await getFocusedMaterialLabel(page);

    if (!label) {
      throw new Error(
        'deleteFocusedMaterial: no material row is focused. Focus one first.',
      );
    }

    await triggerDeleteMaterialFromFocused(page);
    await waitForMaterialItemRemoved(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label, deleted: true }) },
      ],
    };
  },
};
