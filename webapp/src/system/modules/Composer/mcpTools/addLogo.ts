import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { validateSVGFilePath } from '../../../../../electron/main/mcp/helpers/validateSVGFilePath';
import {
  confirmAddLogo,
  openAddLogoPanel,
  openLogoListAccordion,
  setAddLogoColors,
  setAddLogoMethod,
  setAddLogoSize,
  typeAddLogoName,
  uploadAddLogoFile,
} from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import { waitForLogoItem } from '../components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

type AddLogoInput = {
  name: string;
  method: 'embroidery' | 'silkscreen';
  colors?: number;
  width?: number;
  height?: number;
  sourceFixturePath: string;
};

export const addLogoTool = {
  name: 'addLogo',
  description:
    'Add an SVG-source logo to the active Composer variation via the Logos accordion. The source file must be a sanitizable .svg on disk; it is embedded as a DOCUMENT node and injected as a <symbol>. Method is embroidery | silkscreen; colors is 1–10. Cost is priced per placement (set via addLogoPlacement), not on the logo. (Raster sources are not supported by this tool.)',
  inputSchema: {
    name: z.string().describe('Unique label for the logo node (shown in the Logos list).'),
    method: z
      .enum(['embroidery', 'silkscreen'])
      .describe('Print method; maps to a numeric methodFactor in the cost expression.'),
    colors: z
      .number()
      .int()
      .min(1)
      .max(10)
      .optional()
      .describe('Number of colors (1–10). Defaults to 1.'),
    width: z
      .number()
      .positive()
      .optional()
      .describe('Default placement width in cm. Defaults to the form value (8).'),
    height: z
      .number()
      .positive()
      .optional()
      .describe('Default placement height in cm. Defaults to the form value (8).'),
    sourceFixturePath: z
      .string()
      .describe('Absolute path to a .svg logo source file on the host filesystem.'),
  },
  async execute({
    name,
    method,
    colors,
    width,
    height,
    sourceFixturePath,
  }: AddLogoInput) {
    validateSVGFilePath(sourceFixturePath);
    const page = await getPage();
    await page.bringToFront();

    await openLogoListAccordion(page);
    await openAddLogoPanel(page);

    await typeAddLogoName(page, name);
    await setAddLogoMethod(page, method);
    if (colors !== undefined) await setAddLogoColors(page, colors);
    if (width !== undefined) await setAddLogoSize(page, 'width', width);
    if (height !== undefined) await setAddLogoSize(page, 'height', height);

    await uploadAddLogoFile(page, sourceFixturePath);
    await confirmAddLogo(page);
    await waitForLogoItem(page, name);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, name, method }),
        },
      ],
    };
  },
};
