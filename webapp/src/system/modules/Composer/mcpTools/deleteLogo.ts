import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openLogoListAccordion } from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import { deleteLogoByLabel } from '../components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

export const deleteLogoTool = {
  name: 'deleteLogo',
  description:
    'Delete a logo (and all its placements + its owned DOCUMENT node) from the active variation by clicking the delete button on its row in the Logos list.',
  inputSchema: {
    logoLabel: z.string().describe('Label of the logo to delete.'),
  },
  async execute({ logoLabel }: { logoLabel: string }) {
    const page = await getPage();
    await page.bringToFront();

    await openLogoListAccordion(page);
    await deleteLogoByLabel(page, logoLabel);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, logoLabel }) },
      ],
    };
  },
};
