import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import {
  confirmAnnotationLinkElective,
  selectAnnotationElectiveOption,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';
import {
  focusAnnotationRowByKeyboard,
  triggerLinkElectiveForFocusedAnnotation,
} from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.shortcut.puppeteer';

type LinkAnnotationElectiveShortcutInput = {
  annotationLabel: string;
  electiveLabel: string;
};

export const linkAnnotationElectiveShortcutTool = {
  name: 'linkAnnotationElectiveShortcut',
  description:
    'Gate an annotation on an elective by keyboard: focus its row, press "w", pick the elective by label, and confirm.',
  inputSchema: {
    annotationLabel: z.string(),
    electiveLabel: z.string(),
  },
  async execute({
    annotationLabel,
    electiveLabel,
  }: LinkAnnotationElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await focusAnnotationRowByKeyboard(page, annotationLabel);
    await triggerLinkElectiveForFocusedAnnotation(page);
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
