import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Box } from "@mui/system";

export const Composerviewport = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { SettingsPanel, DetailsPanel } = layoutModule.components;
  return (
    <Box role="composer-viewport">
      <SettingsPanel><>Configurações</></SettingsPanel>
      <DetailsPanel><>Detalhes</></DetailsPanel>
    </Box>
  );
};

export default Composerviewport;
