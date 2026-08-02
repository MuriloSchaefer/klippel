import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import {
  renameAnnotation,
  setAnnotationText,
  waitForAnnotationItem,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';

type EditAnnotationInput = {
  label: string;
  newLabel?: string;
  text?: string;
};

export const editAnnotationTool = {
  name: 'editAnnotation',
  description:
    'Edit an existing annotation found by its label: optionally rename it and/or replace its body text.',
  inputSchema: {
    label: z.string().describe('Current label of the annotation to edit.'),
    newLabel: z.string().optional().describe('New label, if renaming.'),
    text: z.string().optional().describe('New body text, if replacing.'),
  },
  async execute({ label, newLabel, text }: EditAnnotationInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await waitForAnnotationItem(page, label);

    if (text !== undefined) await setAnnotationText(page, label, text);
    let effectiveLabel = label;
    if (newLabel !== undefined && newLabel !== label) {
      await renameAnnotation(page, label, newLabel);
      effectiveLabel = newLabel;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label: effectiveLabel }),
        },
      ],
    };
  },
};
