import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import {
  confirmAnnotationLinkElective,
  openAnnotationLinkElective,
  selectAnnotationElectiveOption,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';

type LinkAnnotationElectiveInput = {
  annotationLabel: string;
  electiveLabel: string;
};

export const linkAnnotationElectiveTool = {
  name: 'linkAnnotationElective',
  description:
    'Gate an annotation on an elective: it is hidden from the drawing while the elective is off. Opens the row’s link-elective pointer, picks the elective by label, and confirms.',
  inputSchema: {
    annotationLabel: z.string().describe('Label of the annotation to gate.'),
    electiveLabel: z.string().describe('Label of the elective to link.'),
  },
  async execute({ annotationLabel, electiveLabel }: LinkAnnotationElectiveInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await openAnnotationLinkElective(page, annotationLabel);
    await selectAnnotationElectiveOption(page, electiveLabel);
    await confirmAnnotationLinkElective(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, annotationLabel, electiveLabel }),
        },
      ],
    };
  },
};
