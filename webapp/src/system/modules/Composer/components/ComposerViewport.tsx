import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box } from "@mui/material";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import CustomizedTreeView from "./SettingsPanel/CompositionTree";

export const Composerviewport = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { SettingsPanel, DetailsPanel, Accordion } = layoutModule.components;
  return (
    <Box role="composer-viewport">
      <SettingsPanel>
        <>
          <Accordion
            name="Composição"
            icon={<AccountTreeSharpIcon />}
            summary="composição da peça"
            expanded={true}
          >
            <CustomizedTreeView />
          </Accordion>
          <Accordion
            name="Valores"
            icon={<SellSharpIcon />}
            summary="Preço da peça"
          ><></></Accordion>
        </>
      </SettingsPanel>
      <DetailsPanel display={true}>
        <>Detalhes</>
      </DetailsPanel>
    </Box>
  );
};

export default Composerviewport;
