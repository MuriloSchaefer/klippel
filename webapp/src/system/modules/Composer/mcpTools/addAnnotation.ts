import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import {
  addAnnotation,
  lastAnnotationLabel,
  openAnnotationListAccordion,
} from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import {
  renameAnnotation,
  setAnnotationText,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';

type AddAnnotationInput = { label?: string; text?: string };

export const addAnnotationTool = {
  name: 'addAnnotation',
  description:
    'Add a text annotation pinned to the drawing (Garment Details → Anotações). It renders a label inside the editor SVG with a leader line to a draggable target point. Optionally set its label and body text.',
  inputSchema: {
    label: z.string().optional().describe('Title shown in the annotation row.'),
    text: z.string().optional().describe('Body text rendered in the drawing.'),
  },
  async execute({ label, text }: AddAnnotationInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await addAnnotation(page);

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
