import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  openDocumentListAccordion,
  renameDocumentViaClick,
  uploadDocument,
  waitForDocumentRow,
} from '../components/viewports/DocumentListAccordion/drivers/AddDocumentButton.click.puppeteer';
import { basename } from 'node:path';

type AddDocumentInput = { sourceFilePath: string; label?: string };

export const addDocumentTool = {
  name: 'addDocument',
  description:
    'Attach any file on disk to the active Composer model via the Documentos accordion. The bytes are stored in a Jazz fileStream (not in the model graph), so size is limited only by the 15 MiB upload cap. Optionally set the display label; it defaults to the filename.',
  inputSchema: {
    sourceFilePath: z
      .string()
      .describe('Absolute path of the file to attach. Any type is accepted.'),
    label: z
      .string()
      .optional()
      .describe('Display name for the row; defaults to the filename.'),
  },
  async execute({ sourceFilePath, label }: AddDocumentInput) {
    const page = await getPage();
    await page.bringToFront();

    await openDocumentListAccordion(page);
    await uploadDocument(page, sourceFilePath);

    const filename = basename(sourceFilePath);
    await waitForDocumentRow(page, filename);
    if (label !== undefined && label !== filename) {
      await renameDocumentViaClick(page, filename, label);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            label: label ?? filename,
            filename,
          }),
        },
      ],
    };
  },
};
