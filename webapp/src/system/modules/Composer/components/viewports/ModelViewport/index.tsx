import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import { Box, Button, ButtonGroup, useTheme } from "@mui/material";
import VisualView from "./VisualView";
import ModelView from "./ModelView";
import CompositionTree from "../CompositionTree/CompositionTree";
import useVariation from "../../../hooks/useVariation";

export default function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray, SettingsPanel, Accordion } =
    layoutModule.components;
  const { useActiveViewport, useViewportManager } = layoutModule.hooks;
  const vpManager = useViewportManager();
  const activeVP = useActiveViewport();
  const variation = useVariation(activeVP.extra.variationId)

  const theme = useTheme();

  return (
    <>
      <ViewportNotificationsTray>
        <SaveSharpIcon
          fontSize="small"
          onClick={variation.actions.saveAsModel}
          sx={{ ":hover": { cursor: "pointer", color: "primary.main" } }}
        />
      </ViewportNotificationsTray>

      <SettingsPanel>
        <Accordion
          name="Composição"
          icon={<AccountTreeSharpIcon />}
          summary="composição da peça"
        >
          <CompositionTree variationId={activeVP.extra.variationId} />
        </Accordion>
      </SettingsPanel>
      <Box
        sx={{
          padding: 1,
          height: "100%",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <ButtonGroup
          disableElevation
          variant="contained"
          aria-label="Disabled button group"
          sx={{
            position: "absolute",
            right: 10,
            top: 0,
            zIndex: theme.zIndex.fab,
            backgroundColor: theme.palette.background.default
          }}
        >
          <Button
            variant={
              activeVP.extra.view === "visual" ? "contained" : "outlined"
            }
            onClick={() =>
              vpManager.functions.setExtras(activeVP.name, {
                ...activeVP.extra,
                view: "visual",
              })
            }
          >
            Visual
          </Button>
          <Button
            variant={activeVP.extra.view === "model" ? "contained" : "outlined"}
            onClick={() =>
              vpManager.functions.setExtras(activeVP.name, {
                ...activeVP.extra,
                view: "model",
              })
            }
          >
            Modelo
          </Button>
        </ButtonGroup>
        {activeVP.extra.view === "visual" ? <VisualView variationId={activeVP.extra.variationId}/> : <ModelView />}
      </Box>
    </>
  );
}
