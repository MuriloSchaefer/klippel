import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  focusVisualizationItem,
  triggerEditVisualizationFromFocused,
} from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.shortcut.puppeteer';
import {
  addDomIdToEditVisualization,
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

type EditVisualizationShortcutInput = {
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

export const editVisualizationShortcutTool = {
  name: 'editVisualizationShortcut',
  description:
    'Edit a visualization node via keyboard: focus the row, press "e", apply changes, Ctrl+Enter to confirm.',
  inputSchema: {
    label: z.string(),
    name: z.string().optional(),
    materialNodeLabel: z.string().optional(),
    doms: z.array(domSchema).optional(),
  },
  async execute({ label, name, materialNodeLabel, doms }: EditVisualizationShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await focusVisualizationItem(page, label);
    await triggerEditVisualizationFromFocused(page);

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

    await confirmPointerPanelShortcut(page);

    const finalLabel = name ?? label;
    await waitForVisualizationItem(page, finalLabel);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, label: finalLabel }),
        },
      ],
    };
  },
};
