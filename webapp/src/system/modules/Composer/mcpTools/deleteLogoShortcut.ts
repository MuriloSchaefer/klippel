import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  focusLogoRowByKeyboard,
  triggerDeleteFocusedLogo,
} from '../components/viewports/LogoListAccordion/drivers/LogoItem.shortcut.puppeteer';
import { waitForLogoItemRemoved } from '../components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

export const deleteLogoShortcutTool = {
  name: 'deleteLogoShortcut',
  description:
    'Delete a logo by keyboard: focus its row in the Logos list and press "d".',
  inputSchema: {
    logoLabel: z.string(),
  },
  async execute({ logoLabel }: { logoLabel: string }) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Logos');

    await focusLogoRowByKeyboard(page, logoLabel);
    await triggerDeleteFocusedLogo(page);
    await waitForLogoItemRemoved(page, logoLabel);

    return {
      content: [
        { type: 'text' as const, text: JSON.stringify({ success: true, logoLabel }) },
      ],
    };
  },
};
