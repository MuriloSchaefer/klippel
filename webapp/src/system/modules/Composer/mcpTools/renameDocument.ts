import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  openDocumentListAccordion,
  renameDocumentViaClick,
} from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';

type RenameDocumentInput = { label: string; newLabel: string };

export const renameDocumentTool = {
  name: 'renameDocument',
  description:
    'Rename an attached file in the active Composer model. Changes the display label only; the stored filename is untouched.',
  inputSchema: {
    label: z.string().describe('Current label of the document row.'),
    newLabel: z.string().describe('New display label.'),
  },
  async execute({ label, newLabel }: RenameDocumentInput) {
    const page = await getPage();
    await page.bringToFront();

    await openDocumentListAccordion(page);
    await renameDocumentViaClick(page, label, newLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label: newLabel }),
        },
      ],
    };
  },
};
