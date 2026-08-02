import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  lastAnnotationLabel,
  openAnnotationListAccordion,
} from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import { triggerAddAnnotation } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.shortcut.puppeteer';
import {
  renameAnnotation,
  setAnnotationText,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';

type AddAnnotationShortcutInput = { label?: string; text?: string };

export const addAnnotationShortcutTool = {
  name: 'addAnnotationShortcut',
  description:
    'Add a text annotation by keyboard: focus the Anotações list and press "a". Optionally set its label and body text.',
  inputSchema: {
    label: z.string().optional(),
    text: z.string().optional(),
  },
  async execute({ label, text }: AddAnnotationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await triggerAddAnnotation(page);

    const current = await lastAnnotationLabel(page);
    if (label !== undefined && label !== current) {
      await renameAnnotation(page, current, label);
    }
    const effectiveLabel = label ?? current;
    if (text !== undefined) await setAnnotationText(page, effectiveLabel, text);

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
