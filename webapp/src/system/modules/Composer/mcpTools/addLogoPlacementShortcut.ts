import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import {
  focusLogoRowByKeyboard,
  triggerOpenPlacementsForFocusedLogo,
} from '../components/viewports/LogoListAccordion/drivers/LogoItem.shortcut.puppeteer';
import { triggerAddPlacement } from '../components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.shortcut.puppeteer';
import {
  countPlacementItems,
  renamePlacement,
} from '../components/viewports/LogoListAccordion/drivers/LogoPlacementsButton.click.puppeteer';

type AddLogoPlacementShortcutInput = {
  logoLabel: string;
  name?: string;
};

export const addLogoPlacementShortcutTool = {
  name: 'addLogoPlacementShortcut',
  description:
    'Add a placement to a logo by keyboard: focus the logo row, "p" opens its Placements pointer, "a" adds a copy (injects a <use> into the editor SVG). Optionally renames the new placement.',
  inputSchema: {
    logoLabel: z.string(),
    name: z.string().optional(),
  },
  async execute({ logoLabel, name }: AddLogoPlacementShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Logos');

    await focusLogoRowByKeyboard(page, logoLabel);
    await triggerOpenPlacementsForFocusedLogo(page);
    await triggerAddPlacement(page);

    if (name !== undefined) {
      const lastIndex = (await countPlacementItems(page)) - 1;
      await renamePlacement(page, lastIndex, name);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, logoLabel, name }),
        },
      ],
    };
  },
};
