import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  focusLogoRowByKeyboard,
  triggerLinkElectiveForFocusedLogo,
} from '../components/viewports/LogoListAccordion/drivers/LogoItem.shortcut.puppeteer';
import { selectLogoElectiveOption } from '../components/viewports/LogoListAccordion/drivers/LogoLinkElectiveButton.click.puppeteer';

type LinkLogoElectiveShortcutInput = {
  logoLabel: string;
  electiveLabel: string;
};

export const linkLogoElectiveShortcutTool = {
  name: 'linkLogoElectiveShortcut',
  description:
    'Gate a logo on an elective by keyboard: focus the logo row, "w" opens its link-elective pointer; the elective is picked by label and confirmed by shortcut.',
  inputSchema: {
    logoLabel: z.string(),
    electiveLabel: z.string(),
  },
  async execute({ logoLabel, electiveLabel }: LinkLogoElectiveShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Logos');

    await focusLogoRowByKeyboard(page, logoLabel);
    await triggerLinkElectiveForFocusedLogo(page);
    await selectLogoElectiveOption(page, electiveLabel);
    await confirmPointerPanelShortcut(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, logoLabel, electiveLabel }),
        },
      ],
    };
  },
};
