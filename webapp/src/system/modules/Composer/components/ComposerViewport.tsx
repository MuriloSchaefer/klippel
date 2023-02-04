import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box } from "@mui/material";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import CustomizedTreeView from "./SettingsPanel/CompositionTree";
import { MouseEvent, useCallback } from "react";
import { ISVGModule } from "@kernel/modules/SVG";

export const Composerviewport = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const {components: {SVGViewer}} = useModule<ISVGModule>("SVG");
  const { SettingsPanel, DetailsPanel, Accordion } = layoutModule.components;
  
  
  const panelsManager = layoutModule.hooks.usePanelsManager()
  const viewportManager = layoutModule.hooks.useViewportManager()

  const openDetailsPanel = useCallback((e: MouseEvent)=>{
    e.stopPropagation()
    panelsManager.functions.openDetails()
  }, [])

  return (
    <Box role="composer-viewport" sx={{padding: 1}}>
      <SettingsPanel>
        <Accordion
          name="Composição"
          icon={<AccountTreeSharpIcon />}
          summary="composição da peça"
          expanded={true}
        >
          <CustomizedTreeView />
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

      <DetailsPanel display={true}>
        <>Detalhes</>
      </DetailsPanel>

      <SVGViewer path="catalog/camisa-polo/processed.svg"/>
    </Box>
  );
};

export default Composerviewport;
