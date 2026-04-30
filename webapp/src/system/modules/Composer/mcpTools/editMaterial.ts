import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import {
  clickEditMaterial,
  waitForMaterialItem,
} from '../components/viewports/MaterialListAccordion/components/MaterialItem.click.puppeteer';
import {
  EDIT_MATERIAL_FORM_TESTID,
  EDIT_MATERIAL_MATERIAL_SCOPE,
  EDIT_MATERIAL_TYPE_SCOPE,
  saveEditMaterial,
} from '../components/viewports/MaterialListAccordion/components/EditMaterial.click.puppeteer';
import {
  openMaterialTypeSelector,
  pickMaterialType,
} from '../../../../system/modules/Materials/components/selectors/MaterialType.click.puppeteer';
import {
  pickMaterialById,
  pickMaterialByPrincipalAndExtra,
} from '../../../../system/modules/Materials/components/selectors/Material.click.puppeteer';

type EditMaterialInput =
  | { label: string; type?: string; material: string; extra?: string; materialId?: never }
  | { label: string; type?: string; materialId: number; material?: never; extra?: never };

export const editMaterialTool = {
  name: 'editMaterial',
  description:
    'Edit the material node identified by its UI label. Provide either {material, extra?} (label-based) or {materialId} (id-based). The optional {type} narrows the material type filter.',
  inputSchema: {
    label: z.string().describe('Visible label of the material node to edit.'),
    type: z.string().optional().describe('Material type label, e.g. "tecido e malha".'),
    material: z.string().optional().describe('Principal material name. Mutually exclusive with materialId.'),
    extra: z.string().optional().describe('Optional secondary attribute (color, size).'),
    materialId: z.number().optional().describe('Integer material id. Mutually exclusive with material/extra.'),
  },
  async execute(input: EditMaterialInput) {
    const hasMaterialId = 'materialId' in input && input.materialId !== undefined;
    const hasMaterial = 'material' in input && !!input.material;
    if (!hasMaterialId && !hasMaterial) {
      throw new Error('editMaterial requires either {material, extra?} or {materialId}.');
    }

    const { label, type } = input;
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await waitForMaterialItem(page, label);
    await clickEditMaterial(page, label);
    await page.waitForSelector(`[data-testid="${EDIT_MATERIAL_FORM_TESTID}"]`);

    if (type) {
      await openMaterialTypeSelector(page, EDIT_MATERIAL_TYPE_SCOPE);
      await pickMaterialType(page, type);
    }

    if (hasMaterialId) {
      await pickMaterialById(page, input.materialId!, {
        scopeTestId: EDIT_MATERIAL_MATERIAL_SCOPE,
      });
    } else {
      await pickMaterialByPrincipalAndExtra(page, {
        principal: input.material!,
        extra: input.extra,
        scopeTestId: EDIT_MATERIAL_MATERIAL_SCOPE,
      });
    }

    await saveEditMaterial(page);

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
