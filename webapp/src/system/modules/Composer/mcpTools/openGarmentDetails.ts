import { ensureSettingsPanelExpanded } from "@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer";
import { getPage } from "../../../../../electron/main/mcp/puppeteer";
import { expandAccordion } from "@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer";
import { clickGarmentTreeItem } from "../components/viewports/CompositionTree/drivers/CompositionTree.click.puppeteer";
import {
  ensureGarmentDetailsAccordionExpanded,
  waitForGarmentDetailsPanelVisible,
} from "../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer";

export const openGarmentDetailsTool = {
  name: "openGarmentDetails",
  description:
    'Select the garment node and open its details panel via DOM clicks. Ensures the "Detalhes da Peça" accordion is expanded.',
  inputSchema: {},
  async execute() {
    const page = await getPage();
    await page.bringToFront();
    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, "Composição");
    await clickGarmentTreeItem(page);
    await waitForGarmentDetailsPanelVisible(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    return {
      content: [
        { type: "text" as const, text: JSON.stringify({ success: true }) },
      ],
    };
  },
};
