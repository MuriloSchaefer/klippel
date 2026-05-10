import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  ensureGarmentDetailsAccordionExpanded,
} from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  addDomIdToVisualizationFromFocused,
  selectAddVisualizationMaterialByKeyboard,
  setAddVisualizationDomFillShortcut,
  setAddVisualizationDomStrokeShortcut,
  triggerAddVisualization,
  typeAddVisualizationNameFromFocused,
} from '../components/viewports/VisualizationListAccordion/drivers/AddVisualizationButton.shortcut.puppeteer';
import { triggerFocusVisualizationList } from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.shortcut.puppeteer';
import { waitForVisualizationItem } from '../components/viewports/VisualizationListAccordion/drivers/VisualizationItem.click.puppeteer';

const domSchema = z.object({
  id: z.string(),
  fill: z.boolean().optional(),
  stroke: z.boolean().optional(),
});

type AddVisualizationShortcutInput = {
  name: string;
  materialNodeLabel: string;
  doms: Array<{ id: string; fill?: boolean; stroke?: boolean }>;
};

export const addVisualizationShortcutTool = {
  name: 'addVisualizationShortcut',
  description:
    'Create a new visualization node via keyboard. Each dom carries its own fill/stroke toggles (defaults: fill=true, stroke=false).',
  inputSchema: {
    name: z.string(),
    materialNodeLabel: z.string(),
    doms: z.array(domSchema).min(1),
  },
  async execute({ name, materialNodeLabel, doms }: AddVisualizationShortcutInput) {
    if (doms.length === 0) {
      throw new Error('addVisualizationShortcut requires at least one dom entry.');
    }
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Visualização');

    await triggerFocusVisualizationList(page);
    await triggerAddVisualization(page);
    await typeAddVisualizationNameFromFocused(page, name);
    await page.keyboard.press("Tab")
    await selectAddVisualizationMaterialByKeyboard(page, materialNodeLabel);

    for (const dom of doms) {
      await addDomIdToVisualizationFromFocused(page, dom.id);
      const fill = dom.fill ?? true;
      const stroke = dom.stroke ?? false;
      if (fill !== true)
        await setAddVisualizationDomFillShortcut(page, dom.id, fill);
      if (stroke !== false)
        await setAddVisualizationDomStrokeShortcut(page, dom.id, stroke);
    }

    await confirmPointerPanelShortcut(page);
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
