import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { validateSVGFilePath } from '../../../../../electron/main/mcp/helpers/validateSVGFilePath';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import {
  setAddLogoColorsFromFocused,
  setAddLogoMethodFromKeyboard,
  triggerAddLogo,
  typeAddLogoNameFromFocused,
  uploadAddLogoFileShortcut,
} from '../components/viewports/LogoListAccordion/drivers/AddLogoButton.shortcut.puppeteer';
import { triggerFocusLogoList } from '../components/viewports/LogoListAccordion/drivers/LogoItem.shortcut.puppeteer';
import { waitForLogoItem } from '../components/viewports/LogoListAccordion/drivers/LogoItem.click.puppeteer';

type AddLogoShortcutInput = {
  name: string;
  method: 'embroidery' | 'silkscreen';
  colors?: number;
  sourceFixturePath: string;
};

export const addLogoShortcutTool = {
  name: 'addLogoShortcut',
  description:
    'Add an SVG-source logo via keyboard: Ctrl+l focuses the Logos list, "a" opens the add panel, the form is filled and confirmed by shortcut. Method is embroidery | silkscreen; colors is 1–10. Cost is priced per placement (set via addLogoPlacement), not on the logo.',
  inputSchema: {
    name: z.string(),
    method: z.enum(['embroidery', 'silkscreen']),
    colors: z.number().int().min(1).max(10).optional(),
    sourceFixturePath: z.string(),
  },
  async execute({
    name,
    method,
    colors,
    sourceFixturePath,
  }: AddLogoShortcutInput) {
    validateSVGFilePath(sourceFixturePath);
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Logos');

    await triggerFocusLogoList(page);
    await triggerAddLogo(page);

    await typeAddLogoNameFromFocused(page, name);
    await setAddLogoMethodFromKeyboard(page, method);
    if (colors !== undefined) await setAddLogoColorsFromFocused(page, colors);

    await uploadAddLogoFileShortcut(page, sourceFixturePath);
    await confirmPointerPanelShortcut(page);
    await waitForLogoItem(page, name);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ success: true, name, method }),
        },
      ],
    };
  },
};
