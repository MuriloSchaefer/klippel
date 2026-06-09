import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openLogoListAccordion } from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.click.puppeteer';
import {
  confirmLogoLinkElective,
  openLogoLinkElective,
  selectLogoElectiveOption,
} from '../components/viewports/LogoListAccordion/drivers/LogoLinkElectiveButton.click.puppeteer';

type LinkLogoElectiveInput = {
  logoLabel: string;
  electiveLabel: string;
};

export const linkLogoElectiveTool = {
  name: 'linkLogoElective',
  description:
    'Gate a logo on an elective: when the elective is off the logo contributes no cost (audit skipped). Opens the logo row’s link-elective pointer, picks the elective by label, and confirms.',
  inputSchema: {
    logoLabel: z.string().describe('Label of the logo to gate.'),
    electiveLabel: z.string().describe('Label of the elective to link.'),
  },
  async execute({ logoLabel, electiveLabel }: LinkLogoElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await openLogoListAccordion(page);
    await openLogoLinkElective(page, logoLabel);
    await selectLogoElectiveOption(page, electiveLabel);
    await confirmLogoLinkElective(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, logoLabel, electiveLabel }),
        },
      ],
    };
  },
};
