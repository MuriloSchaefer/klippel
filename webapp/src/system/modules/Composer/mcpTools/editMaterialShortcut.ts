import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import {
  focusMaterialItem,
  triggerEditMaterialFromFocused,
} from '../components/viewports/MaterialListAccordion/components/MaterialItem.shortcut.puppeteer';
import { waitForMaterialItem } from '../components/viewports/MaterialListAccordion/components/MaterialItem.click.puppeteer';
import { confirmEditMaterialFromFocused } from '../components/viewports/MaterialListAccordion/components/EditMaterial.shortcut.puppeteer';
import { pickMaterialTypeFromFocused } from '../../../../system/modules/Materials/components/selectors/MaterialType.shortcut.puppeteer';
import {
  pickMaterialByIdFromFocused,
  pickMaterialByPrincipalAndExtraFromFocused,
} from '../../../../system/modules/Materials/components/selectors/Material.shortcut.puppeteer';

type EditMaterialShortcutInput =
  | { label: string; type?: string; material: string; extra?: string; materialId?: never }
  | { label: string; type?: string; materialId: number; material?: never; extra?: never };

export const editMaterialShortcutTool = {
  name: 'editMaterialShortcut',
  description:
    'Edit a material node via the keyboard path: focus the row by label, press "e", tab through the form, confirm.',
  inputSchema: {
    label: z.string(),
    type: z.string().optional(),
    material: z.string().optional(),
    extra: z.string().optional(),
    materialId: z.number().optional(),
  },
  async execute(input: EditMaterialShortcutInput) {
    const hasMaterialId = 'materialId' in input && input.materialId !== undefined;
    const hasMaterial = 'material' in input && !!input.material;
    if (!hasMaterialId && !hasMaterial) {
      throw new Error('editMaterialShortcut requires either {material, extra?} or {materialId}.');
    }

    const { label, type } = input;
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await waitForMaterialItem(page, label);
    await focusMaterialItem(page, label);
    await triggerEditMaterialFromFocused(page);

    // Form mounts; first Tab from the focused row lands on the type Select.
    await page.keyboard.press('Tab');

    if (type) {
      await pickMaterialTypeFromFocused(page, type);
    }

    await page.keyboard.press('Tab'); // → material principal Select

    if ('materialId' in input && input.materialId !== undefined) {
      await pickMaterialByIdFromFocused(page, input.materialId);
    } else if ('material' in input && input.material) {
      await pickMaterialByPrincipalAndExtraFromFocused(page, {
        principal: input.material,
        extra: input.extra,
      });
    } else {
      throw new Error('editMaterialShortcut requires either {material, extra?} or {materialId}.');
    }

    // After the material Select, focus tabs forward to the save button.
    await page.keyboard.press('Tab');
    await confirmEditMaterialFromFocused(page);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            label,
            ...('materialId' in input
              ? { materialId: input.materialId }
              : { material: input.material, extra: input.extra }),
            ...(type ? { type } : {}),
          }),
        },
      ],
    };
  },
};
