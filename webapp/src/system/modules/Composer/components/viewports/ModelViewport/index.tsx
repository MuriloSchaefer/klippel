import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import { Box, Button, ButtonGroup } from "@mui/material";
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

  return (
    <>
      <ViewportNotificationsTray>
        <SaveSharpIcon
          fontSize="small"
          onClick={() => console.log("save model")}
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
      <Box sx={{ position: "relative" }}>
        <ButtonGroup
          disableElevation
          variant="contained"
          aria-label="Disabled button group"
          sx={{ position: "absolute", right: 10, top: 0 }}
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
        <Box id="view">
          {activeVP.extra.view === "visual" ? <VisualView /> : <ModelView />}
        </Box>
      </Box>
    </>
  );
}
