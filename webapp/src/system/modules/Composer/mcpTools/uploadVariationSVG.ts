import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { validateSVGFilePath } from '../../../../../electron/main/mcp/helpers/validateSVGFilePath';
import {
  armChooserAndClickUploadButton,
  waitForSVGEmptyState,
  waitForSVGLoaded,
} from '../components/viewports/ModelViewport/SVGView/drivers/SVGEmptyState.click.puppeteer';

export const uploadVariationSVGTool = {
  name: 'uploadVariationSVG',
  description:
    'Upload an SVG file from disk to the active Composer variation by clicking the empty-state "Fazer upload de SVG" button. Requires the ModelViewport to be in SVG view with no SVG yet loaded.',
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
    await armChooserAndClickUploadButton(page, filePath);
    await waitForSVGLoaded(page);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true }) },
      ],
    };
  },
};
