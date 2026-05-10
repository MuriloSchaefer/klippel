import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import {
  addDomIdToEditVisualization,
  clickEditVisualization,
  removeDomFromEditVisualization,
  selectEditVisualizationMaterial,
  setEditVisualizationDomFill,
  setEditVisualizationDomStroke,
  typeEditVisualizationName,
  waitForVisualizationItem,
} from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.click.puppeteer';

const domSchema = z.object({
  id: z.string(),
  fill: z.boolean().optional(),
  stroke: z.boolean().optional(),
});

type EditVisualizationInput = {
  label: string;
  name?: string;
  materialNodeLabel?: string;
  doms?: Array<{ id: string; fill?: boolean; stroke?: boolean }>;
};

const collectCurrentDomIds = async (page: import('puppeteer-core').Page) =>
  page.$$eval(
    '[role="pointer-panel-content"] [data-testid="edit-visualization-form"] [data-testid="edit-visualization-dom"]',
    (nodes) =>
      nodes
        .map((n) => n.getAttribute('data-dom-id'))
        .filter((id): id is string => !!id),
  );

export const editVisualizationTool = {
  name: 'editVisualization',
  description:
    'Edit an existing visualization node. Provide a full `doms` array to replace the current binding (each entry { id, fill?, stroke? }).',
  inputSchema: {
    label: z.string().describe('Current label of the visualization node to edit.'),
    name: z.string().optional(),
    materialNodeLabel: z.string().optional(),
    doms: z
      .array(domSchema)
      .optional()
      .describe('Replacement list of dom bindings. Omit to leave existing bindings untouched.'),
  },
  async execute({ label, name, materialNodeLabel, doms }: EditVisualizationInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await waitForVisualizationItem(page, label);
    await clickEditVisualization(page, label);

    if (name !== undefined) await typeEditVisualizationName(page, name);
    if (materialNodeLabel !== undefined)
      await selectEditVisualizationMaterial(page, materialNodeLabel);

    if (doms !== undefined) {
      const targetIds = new Set(doms.map((d) => d.id));
      const existing = await collectCurrentDomIds(page);
      for (const existingId of existing) {
        if (!targetIds.has(existingId)) {
          await removeDomFromEditVisualization(page, existingId);
        }
      }
      for (const dom of doms) {
        if (!existing.includes(dom.id)) {
          await addDomIdToEditVisualization(page, dom.id);
        }
        const fill = dom.fill ?? true;
        const stroke = dom.stroke ?? false;
        await setEditVisualizationDomFill(page, dom.id, fill);
        await setEditVisualizationDomStroke(page, dom.id, stroke);
      }
    }

    await confirmPointerPanel(page);

    const finalLabel = name ?? label;
    await waitForVisualizationItem(page, finalLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            label: finalLabel,
            ...(materialNodeLabel ? { materialNodeLabel } : {}),
            ...(doms ? { doms } : {}),
          }),
        },
      ],
    };
  },
};
