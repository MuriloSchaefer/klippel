import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanelShortcut } from '@kernel/modules/Pointer/components/drivers/PointerContainer.shortcut.puppeteer';
import { focusProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.shortcut.puppeteer';
import {
  triggerLinkMaterialFromFocused,
  selectLinkMaterialOptionByKeyboard,
  submitLinkMaterialFromFocused,
  expandGradeAccordionFromFocused,
  toggleGradeOverrideFromFocused,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessMaterialUsageButton.shortcut.puppeteer';
import {
  setCompoundValue,
  type CompoundValue,
} from '@helpers/puppeteer/compoundSelector';
import {
  LINK_MATERIAL_FORM_TESTID,
  LINK_MATERIAL_AMOUNT_TESTID,
  LINK_MATERIAL_GRADE_ROW_TESTID,
  LINK_MATERIAL_GRADE_CONSUMPTION_TESTID,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessMaterialUsageButton.click.puppeteer';

const unitValueSchema = z.object({
  amount: z.number(),
  unit: z.string(),
});
const compoundValueSchema = z.object({
  quotient: unitValueSchema,
  dividend: unitValueSchema,
});

type LinkProcessMaterialShortcutInput = {
  processLabel: string;
  materialLabel: string;
  consumption?: CompoundValue;
  consumptionPerGrade?: Record<string, CompoundValue>;
};

const mainAmountScope = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"] [data-testid="${LINK_MATERIAL_AMOUNT_TESTID}"]`;

const gradeAmountScope = (gradLabel: string) =>
  `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"][data-graduation-label="${gradLabel}"] [data-testid="${LINK_MATERIAL_GRADE_CONSUMPTION_TESTID}"]`;

export const linkProcessMaterialShortcutTool = {
  name: 'linkProcessMaterialShortcut',
  description:
    'Link a process to a material via keyboard: focus the row, press "m", pick the material, optionally set the consumption compound (quotient + dividend amounts/units), submit "Adicionar", optionally override per-graduation consumption, then Ctrl+Enter to confirm.',
  inputSchema: {
    processLabel: z.string(),
    materialLabel: z.string(),
    consumption: compoundValueSchema
      .optional()
      .describe(
        'Optional default consumption as a compound value (quotient + dividend, each with amount and unit id). Defaults to 1 kg / 1 un when omitted.',
      ),
    consumptionPerGrade: z
      .record(z.string(), compoundValueSchema)
      .optional()
      .describe(
        'Optional map of graduation label → compound consumption. When set, each entry toggles the override switch and writes the full compound into the per-grade selector.',
      ),
  },
  async execute({
    processLabel,
    materialLabel,
    consumption,
    consumptionPerGrade,
  }: LinkProcessMaterialShortcutInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await focusProcessItem(page, processLabel);
    await triggerLinkMaterialFromFocused(page);
    await selectLinkMaterialOptionByKeyboard(page, materialLabel);

    if (consumption) {
      await setCompoundValue(page, mainAmountScope, consumption);
    }

    await submitLinkMaterialFromFocused(page);

    if (consumptionPerGrade && Object.keys(consumptionPerGrade).length > 0) {
      await expandGradeAccordionFromFocused(page);
      for (const [gradLabel, value] of Object.entries(consumptionPerGrade)) {
        await toggleGradeOverrideFromFocused(page, gradLabel);
        await setCompoundValue(page, gradeAmountScope(gradLabel), value);
      }
    }

    await confirmPointerPanelShortcut(page);
    // Cost-recompute middleware debounces 300ms after edgeAdded; let it settle
    // so downstream audit reads see the new CONSUMES step.
    await new Promise((r) => setTimeout(r, 500));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            processLabel,
            materialLabel,
            consumption: consumption ?? null,
            consumptionPerGrade: consumptionPerGrade ?? null,
          }),
        },
      ],
    };
  },
};
