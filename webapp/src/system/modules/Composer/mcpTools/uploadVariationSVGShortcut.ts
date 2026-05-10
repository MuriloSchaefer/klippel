import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { validateSVGFilePath } from '../../../../../electron/main/mcp/helpers/validateSVGFilePath';
import { armChooserAndPressUploadBinding } from '../components/viewports/ModelViewport/SVGView/drivers/SVGEmptyState.shortcut.puppeteer';
import {
  waitForSVGEmptyState,
  waitForSVGLoaded,
} from '../components/viewports/ModelViewport/SVGView/drivers/SVGEmptyState.click.puppeteer';

export const uploadVariationSVGShortcutTool = {
  name: 'uploadVariationSVGShortcut',
  description:
    'Upload an SVG file from disk to the active Composer variation by pressing the "u" keyboard shortcut while the SVG empty state is visible.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: 'Absolute path to a .svg file on the host filesystem.',
      },
    },
    required: ['filePath'],
  },
  async execute({ filePath }: { filePath: string }) {
    validateSVGFilePath(filePath);
    const page = await getPage();
    await page.bringToFront();

    await waitForSVGEmptyState(page);
    await armChooserAndPressUploadBinding(page, filePath);
    await waitForSVGLoaded(page);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true }) },
      ],
    };
  },
};
