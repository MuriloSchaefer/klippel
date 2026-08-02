import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { openAnnotationListAccordion } from '../components/viewports/AnnotationListAccordion/drivers/AddAnnotationButton.click.puppeteer';
import { deleteAnnotationByLabel } from '../components/viewports/AnnotationListAccordion/drivers/AnnotationItem.click.puppeteer';

export const deleteAnnotationTool = {
  name: 'deleteAnnotation',
  description:
    'Delete an annotation (and its rendered label/leader/target) from the active variation by clicking the delete button on its row.',
  inputSchema: {
    annotationLabel: z.string().describe('Label of the annotation to delete.'),
  },
  async execute({ annotationLabel }: { annotationLabel: string }) {
    const page = await getPage();
    await page.bringToFront();

    await openAnnotationListAccordion(page);
    await deleteAnnotationByLabel(page, annotationLabel);

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
