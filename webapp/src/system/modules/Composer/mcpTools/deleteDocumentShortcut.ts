import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { deleteDocumentViaShortcut } from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.shortcut.puppeteer';

type DeleteDocumentShortcutInput = { label: string };

export const deleteDocumentShortcutTool = {
  name: 'deleteDocumentShortcut',
  description:
    'Keyboard variant of deleteDocument: focuses the row and presses "d".',
  inputSchema: {
    label: z.string().describe('Label of the document row to delete.'),
  },
  async execute({ label }: DeleteDocumentShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await deleteDocumentViaShortcut(page, label);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, label }) },
      ],
    };
  },
};
