import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import {
  renameAnnotation,
  setAnnotationText,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';
import { focusAnnotationRowByKeyboard } from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.shortcut.puppeteer';

type EditAnnotationShortcutInput = {
  label: string;
  newLabel?: string;
  text?: string;
};

export const editAnnotationShortcutTool = {
  name: 'editAnnotationShortcut',
  description:
    'Edit an annotation reached by keyboard: focus its row in the Anotações list, then optionally rename and/or replace its body text.',
  inputSchema: {
    label: z.string(),
    newLabel: z.string().optional(),
    text: z.string().optional(),
  },
  async execute({ label, newLabel, text }: EditAnnotationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await focusAnnotationRowByKeyboard(page, label);

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
