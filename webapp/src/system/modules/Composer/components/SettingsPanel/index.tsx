import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import CompositionTree from "./CompositionTree";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

const ComposerSettingsPanel = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { SettingsPanel, Accordion } = layoutModule.components;

  return (
    <SettingsPanel>
      <Accordion
        name="Composição"
        icon={<AccountTreeSharpIcon />}
        summary="composição da peça"
        expanded={true}
      >
        <CompositionTree />
      </Accordion>

      <Accordion
        name="Sumário"
        icon={<ShortTextSharpIcon />}
        summary="Resumo da peça"
      >
        <></>
      </Accordion>
      <Accordion
        name="Valores"
        icon={<SellSharpIcon />}
        summary="Preço da peça"
      >
        <></>
      </Accordion>
      <Accordion
        name="Materiais"
        icon={<ListSharpIcon />}
        summary="Lista de materiais"
      >
        <></>
      </Accordion>
      <Accordion
        name="Processos"
        icon={<ListSharpIcon />}
        summary="Lista de processos"
      >
        <></>
      </Accordion>
    </SettingsPanel>
  );
};

export default ComposerSettingsPanel;
