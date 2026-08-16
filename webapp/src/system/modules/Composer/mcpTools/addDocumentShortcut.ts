import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  openDocumentListAccordion,
  renameDocumentViaClick,
  waitForDocumentRow,
} from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';
import { uploadDocumentViaShortcut } from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.shortcut.puppeteer';
import { basename } from 'node:path';

type AddDocumentShortcutInput = { sourceFilePath: string; label?: string };

export const addDocumentShortcutTool = {
  name: 'addDocumentShortcut',
  description:
    'Keyboard variant of addDocument: focuses the Documentos accordion with Ctrl+d and triggers the upload with "a". The file itself is still supplied programmatically — there is no OS picker to drive.',
  inputSchema: {
    sourceFilePath: z.string().describe('Absolute path of the file to attach.'),
    label: z
      .string()
      .optional()
      .describe('Display name for the row; defaults to the filename.'),
  },
  async execute({ sourceFilePath, label }: AddDocumentShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await uploadDocumentViaShortcut(page, sourceFilePath);

    const filename = basename(sourceFilePath);
    await waitForDocumentRow(page, filename);
    if (label !== undefined && label !== filename) {
      await openDocumentListAccordion(page);
      await renameDocumentViaClick(page, filename, label);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label: label ?? filename }),
        },
      ],
    };
  },
};
