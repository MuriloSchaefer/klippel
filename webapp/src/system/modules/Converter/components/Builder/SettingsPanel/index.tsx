
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import NodeTypeAccordion from "./NodeTypeAccordion";

export default () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { SettingsPanel, Accordion } = layoutModule.components;

  return (
    <SettingsPanel>
      <Accordion
        name="Nodos"
        icon={<AccountTreeSharpIcon />}
        summary="Tipos de nodos disponíveis"
      >
        <NodeTypeAccordion />
      </Accordion>
      <></>
    </SettingsPanel>
  );
};
