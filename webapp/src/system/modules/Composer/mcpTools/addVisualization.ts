import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  addDomIdToVisualization,
  openAddVisualizationPanel,
  selectAddVisualizationMaterial,
  setAddVisualizationDomFill,
  setAddVisualizationDomStroke,
  typeAddVisualizationName,
} from '../components/viewports/VisualizationListAccordion/drivers/AddVisualizationButton.click.puppeteer';
import { waitForVisualizationItem } from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.click.puppeteer';

const domSchema = z.object({
  id: z.string(),
  fill: z.boolean().optional(),
  stroke: z.boolean().optional(),
});

type AddVisualizationInput = {
  name: string;
  materialNodeLabel: string;
  doms: Array<{ id: string; fill?: boolean; stroke?: boolean }>;
};

export const addVisualizationTool = {
  name: 'addVisualization',
  description:
    'Create a new visualization node binding a material to one or more SVG elements. Each dom carries its own fill/stroke toggles (defaults: fill=true, stroke=false).',
  inputSchema: {
    name: z.string().describe('Unique label for the visualization node.'),
    materialNodeLabel: z
      .string()
      .describe('Label of the material node to bind (visible in the Materiais list).'),
    doms: z
      .array(domSchema)
      .min(1)
      .describe('List of { id, fill?, stroke? } entries; one per SVG element to bind.'),
  },
  async execute({ name, materialNodeLabel, doms }: AddVisualizationInput) {
    if (doms.length === 0) {
      throw new Error('addVisualization requires at least one dom entry.');
    }
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await openAddVisualizationPanel(page);
    await typeAddVisualizationName(page, name);
    await selectAddVisualizationMaterial(page, materialNodeLabel);

    for (const dom of doms) {
      await addDomIdToVisualization(page, dom.id);
      const fill = dom.fill ?? true;
      const stroke = dom.stroke ?? false;
      if (fill !== true) await setAddVisualizationDomFill(page, dom.id, fill);
      if (stroke !== false) await setAddVisualizationDomStroke(page, dom.id, stroke);
    }

    await confirmPointerPanel(page);
    await waitForVisualizationItem(page, name);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, name, materialNodeLabel, doms }),
        },
      ],
    };
  },
};
