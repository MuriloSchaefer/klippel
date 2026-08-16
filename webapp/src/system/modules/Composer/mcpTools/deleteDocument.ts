import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  deleteDocumentViaClick,
  openDocumentListAccordion,
} from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';

type DeleteDocumentInput = { label: string };

export const deleteDocumentTool = {
  name: 'deleteDocument',
  description:
    'Remove an attached file from the active Composer model, addressed by the label shown in its Documentos row.',
  inputSchema: {
    label: z.string().describe('Label of the document row to delete.'),
  },
  async execute({ label }: DeleteDocumentInput) {
    const page = await getPage();
    await page.bringToFront();

    await openDocumentListAccordion(page);
    await deleteDocumentViaClick(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label }) },
      ],
    };
  },
};
