import { z } from 'zod';

import { getPage } from '../../../../../electron/main/mcp/puppeteer';
import { ensureSettingsPanelExpanded } from '@kernel/modules/Layout/components/Panels/drivers/SettingsPanel.click.puppeteer';
import { expandAccordion } from '@kernel/modules/Layout/components/Panels/drivers/Accordion.click.puppeteer';
import { ensureGarmentDetailsAccordionExpanded } from '../components/viewports/ModelViewport/DetailPanel/drivers/GarmentDetails.click.puppeteer';
import { confirmPointerPanel } from '@kernel/modules/Pointer/components/drivers/PointerContainer.click.puppeteer';
import { waitForProcessItem } from '../components/viewports/ProcessListAccordion/drivers/ProcessItem.click.puppeteer';
import {
  clickProcessLinkMaterial,
  selectLinkMaterialOption,
  clickAddLinkMaterial,
  expandGradeAccordion,
  toggleGradeOverride,
  setCompoundValue,
  LINK_MATERIAL_FORM_TESTID,
  LINK_MATERIAL_AMOUNT_TESTID,
  LINK_MATERIAL_GRADE_ROW_TESTID,
  LINK_MATERIAL_GRADE_CONSUMPTION_TESTID,
  type CompoundValue,
} from '../components/viewports/ProcessListAccordion/drivers/ProcessMaterialUsageButton.click.puppeteer';

const unitValueSchema = z.object({
  amount: z.number(),
  unit: z.string(),
});
const compoundValueSchema = z.object({
  quotient: unitValueSchema,
  dividend: unitValueSchema,
});

type LinkProcessMaterialInput = {
  processLabel: string;
  materialLabel: string;
  consumption?: CompoundValue;
  consumptionPerGrade?: Record<string, CompoundValue>;
};

const mainAmountScope = `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_FORM_TESTID}"] [data-testid="${LINK_MATERIAL_AMOUNT_TESTID}"]`;

const gradeAmountScope = (gradLabel: string) =>
  `[role="pointer-panel-content"] [data-testid="${LINK_MATERIAL_GRADE_ROW_TESTID}"][data-graduation-label="${gradLabel}"] [data-testid="${LINK_MATERIAL_GRADE_CONSUMPTION_TESTID}"]`;

export const linkProcessMaterialTool = {
  name: 'linkProcessMaterial',
  description:
    'Link a process node to a material by label (click flow). Opens the link panel from the process row, selects the material, optionally sets the consumption compound (quotient + dividend amounts/units), adds the consumption entry, optionally overrides per-graduation consumption, and confirms.',
  inputSchema: {
    processLabel: z.string().describe('Label of the process to link.'),
    materialLabel: z
      .string()
      .describe('Label of the material node already present in the variation.'),
    consumption: compoundValueSchema
      .optional()
      .describe(
        'Optional default consumption as a compound value. Each side carries an amount and a unit id (e.g. {quotient:{amount:2, unit:"kilogramas6"}, dividend:{amount:1, unit:"unitario18"}}). Defaults to 1 kg / 1 un when omitted.',
      ),
    consumptionPerGrade: z
      .record(z.string(), compoundValueSchema)
      .optional()
      .describe(
        'Optional map of graduation label → compound consumption. When set, each entry toggles the override switch for that graduation and writes the full compound (amounts + unit ids) into the per-grade consumption selector.',
      ),
  },
  async execute({
    processLabel,
    materialLabel,
    consumption,
    consumptionPerGrade,
  }: LinkProcessMaterialInput) {
    const page = await getPage();
    await page.bringToFront();

    await ensureSettingsPanelExpanded(page);
    await ensureGarmentDetailsAccordionExpanded(page);
    await expandAccordion(page, 'Processos da Peça');

    await waitForProcessItem(page, processLabel);
    await clickProcessLinkMaterial(page, processLabel);
    await selectLinkMaterialOption(page, materialLabel);

    if (consumption) {
      await setCompoundValue(page, mainAmountScope, consumption);
    }

    await clickAddLinkMaterial(page);

    if (consumptionPerGrade && Object.keys(consumptionPerGrade).length > 0) {
      await expandGradeAccordion(page);
      for (const [gradLabel, value] of Object.entries(consumptionPerGrade)) {
        await toggleGradeOverride(page, gradLabel);
        await setCompoundValue(page, gradeAmountScope(gradLabel), value);
      }
    }

    await confirmPointerPanel(page);
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
