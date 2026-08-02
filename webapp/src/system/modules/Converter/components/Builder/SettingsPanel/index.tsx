
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import NodeTypeAccordion from "./NodeTypeAccordion";

export default () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { SettingsPanel, Accordion } = layoutModule.components;
  const { focusFirstRow } = layoutModule.utils;

  return (
    <SettingsPanel>
      <Accordion
        name="Nodos"
        icon={<AccountTreeSharpIcon />}
        summary="Tipos de nodos disponíveis"
        focusOnOpen={focusFirstRow}
      >
        <NodeTypeAccordion />
      </Accordion>
    </SettingsPanel>
  );
};
