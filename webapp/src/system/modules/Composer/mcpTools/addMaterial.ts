import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '../../../../kernel/modules/Layout/components/Panels/SettingsPanel.click.puppeteer';
import { expandAccordion } from '../../../../kernel/modules/Layout/components/Panels/Accordion.click.puppeteer';
import {
  confirmPointerPanel,
  openPointerPanel,
} from '../../../../kernel/modules/Pointer/components/PointerContainer.click.puppeteer';
import {
  openMaterialTypeSelector,
  pickMaterialType,
} from '../../../../system/modules/Materials/components/selectors/MaterialType.click.puppeteer';
import {
  pickMaterialById,
  pickMaterialByPrincipalAndExtra,
} from '../../../../system/modules/Materials/components/selectors/Material.click.puppeteer';

const MATERIAL_FORM_TESTID = 'add-material-form';
const MATERIAL_LABEL_SELECTOR = `[data-testid="${MATERIAL_FORM_TESTID}"] div[data-testid="add-material-label"] input`;
const MATERIAL_TYPE_SCOPE = 'add-material-type';
const MATERIAL_SELECTOR_SCOPE = 'add-material-material';

type AddMaterialInput =
  | { label: string; type: string; material: string; extra?: string; materialId?: never }
  | { label: string; type: string; materialId: number; material?: never; extra?: never };

export const addMaterialTool = {
  name: 'addMaterial',
  description:
    'Create a new material node in the active Composer ModelViewport. Provide either {material, extra?} (label-based) or {materialId} (id-based).',
  inputSchema: {
    label: z.string().describe('Unique label for the material node.'),
    type: z.string().describe('Material type label as shown in the "Tipo" dropdown (e.g. "tecido e malha").'),
    material: z.string().optional().describe('Principal material name (e.g. "tricoline"). Mutually exclusive with materialId.'),
    extra: z.string().optional().describe('Optional secondary attribute (e.g. color, size). If omitted, the first available option is selected.'),
    materialId: z.number().optional().describe('Integer material id. Mutually exclusive with material/extra.'),
  },
  async execute(input: AddMaterialInput) {
    const { label, type } = input;
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await expandAccordion(page, 'Materiais');

    await page.click("#composer-add-material");

    await page.waitForSelector(MATERIAL_LABEL_SELECTOR);
    await page.click(MATERIAL_LABEL_SELECTOR);
    
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Delete');
    
    await page.type(MATERIAL_LABEL_SELECTOR, label);

    await openMaterialTypeSelector(page, MATERIAL_TYPE_SCOPE);
    await pickMaterialType(page, type);

    if ('materialId' in input && input.materialId !== undefined) {
      await pickMaterialById(page, input.materialId, { scopeTestId: MATERIAL_SELECTOR_SCOPE });
    } else if ('material' in input && input.material) {
      await pickMaterialByPrincipalAndExtra(page, {
        principal: input.material,
        extra: input.extra,
        scopeTestId: MATERIAL_SELECTOR_SCOPE,
      });
    } else {
      throw new Error('addMaterial requires either {material, extra?} or {materialId}.');
    }

    await confirmPointerPanel(page);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, label, type, ...('materialId' in input ? { materialId: input.materialId } : { material: input.material, extra: input.extra }) }),
      }],
    };
  },
};
