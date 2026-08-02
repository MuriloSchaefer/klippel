import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import { waitForAnnotationItemRemoved } from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';
import {
  focusAnnotationRowByKeyboard,
  triggerDeleteFocusedAnnotation,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.shortcut.puppeteer';

export const deleteAnnotationShortcutTool = {
  name: 'deleteAnnotationShortcut',
  description:
    'Delete an annotation by keyboard: focus its row in the Anotações list and press "d".',
  inputSchema: {
    annotationLabel: z.string(),
  },
  async execute({ annotationLabel }: { annotationLabel: string }) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await focusAnnotationRowByKeyboard(page, annotationLabel);
    await triggerDeleteFocusedAnnotation(page);
    await waitForAnnotationItemRemoved(page, annotationLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, annotationLabel }),
        },
      ],
    };
  },
};
