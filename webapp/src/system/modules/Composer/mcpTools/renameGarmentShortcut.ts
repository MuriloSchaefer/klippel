import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { blurActiveElement } from '../../../../../electron/main/mcp/helpers/focus';
import {
  triggerOpenGarmentDetails,
  triggerRenameGarment,
  typeGarmentNameFromFocused,
} from '../components/viewports/ModelViewport/DetailPanel/GarmentDetails.shortcut.puppeteer';

const RENAME_DEBOUNCE_MS = 1100;

export const renameGarmentShortcutTool = {
  name: 'renameGarmentShortcut',
  description:
    'Select the garment, open the details panel via Ctrl+Alt+P, focus the rename input via "e", and type the new name. Waits for the debounced commit.',
  inputSchema: {
    name: z.string().describe('New label for the garment node.'),
  },
  async execute({ name }: { name: string }) {
    const page = await getPage();
    await page.bringToFront();
    // Make sure no material item is focused — otherwise "e" would edit it.
    await blurActiveElement(page);
    await triggerOpenGarmentDetails(page);
    await triggerRenameGarment(page);
    await typeGarmentNameFromFocused(page, name);
    await new Promise((resolve) => setTimeout(resolve, RENAME_DEBOUNCE_MS));
    await blurActiveElement(page);
    return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, name }) }] };
  },
};
