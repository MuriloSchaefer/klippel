import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { triggerFocusMaterialList } from '../components/viewports/MaterialListAccordion/components/drivers/MaterialItem.shortcut.puppeteer';
import { pickMaterialTypeFromFocused, toggleMaterialTypeOptionFromFocused } from '@system/modules/Materials/components/selectors/drivers/MaterialType.shortcut.puppeteer';
import { pickMaterialByIdFromFocused, pickMaterialByPrincipalAndExtraFromFocused } from '@system/modules/Materials/components/selectors/drivers/Material.shortcut.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';


export const ADD_MATERIAL_SHORTCUT = 'a' as const;

type AddMaterialShortcutInput =
  | { label?: string; type?: string; material?: string; extra?: string; materialId?: never }
  | { label: string; type: string; materialId: number; material?: never; extra?: never };

export const addMaterialShortcutTool = {
  name: 'addMaterialShortcut',
  description:
    'Create a new material node using the keyboard shortcut path: triggers "a", tabs through the form, confirms with Ctrl+Enter. With no arguments, opens the panel only (parity with the original behavior).',
  inputSchema: {
    label: z.string().optional(),
    type: z.string().optional(),
    material: z.string().optional(),
    extra: z.string().optional(),
    materialId: z.number().optional(),
  },
  async execute(input: AddMaterialShortcutInput = {}) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    // 'a' is scoped to the MaterialList focus context; ensure focus lands
    // inside the accordion before pressing.
    await triggerFocusMaterialList(page);
    await page.keyboard.press(ADD_MATERIAL_SHORTCUT);
    await page.waitForSelector('[role="pointer-panel-content"] [data-testid="add-material-form"]');

    // No-arg invocation just opens the panel (preserves original behavior).
    if (!input.label) {
      return { content: [{ type: 'text' as const, text: JSON.stringify({ success: true, opened: true }) }] };
    }
    if (!input.type) throw new Error('addMaterialShortcut requires "type" when "label" is provided.');

    // Focus is on the label field (first focusable in the panel).
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    await page.keyboard.type(input.label);

    // Restrict allowed types first; otherwise the type Autocomplete is filtered to nothing.
    await page.keyboard.press('Tab'); // → typeRestrictions
    await toggleMaterialTypeOptionFromFocused(page, input.type);
    await page.keyboard.press('Tab'); // → type

    await pickMaterialTypeFromFocused(page, input.type);

    await page.keyboard.press('Tab'); // → material principal

    if ('materialId' in input && input.materialId !== undefined) {
      await pickMaterialByIdFromFocused(page, input.materialId);
    } else if (input.material) {
      await pickMaterialByPrincipalAndExtraFromFocused(page, {
        principal: input.material,
        extra: input.extra,
      });
    } else {
      throw new Error('addMaterialShortcut requires either {material, extra?} or {materialId}.');
    }

    await confirmPointerPanelShortcut(page);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          label: input.label,
          type: input.type,
          ...('materialId' in input ? { materialId: input.materialId } : { material: input.material, extra: input.extra }),
        }),
      }],
    };
  },
};
