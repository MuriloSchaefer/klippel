import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import { Box, Button, ButtonGroup } from "@mui/material";
import VisualView from "./VisualView";
import ModelView from "./ModelView";

export default function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray, SettingsPanel, Accordion } =
    layoutModule.components;
  const { useActiveViewport, useViewportManager } = layoutModule.hooks;
  const viewport = useActiveViewport();
  const vpManager = useViewportManager();

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
          Arvore
          {/* <CompositionTree /> */}
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
              viewport.extra.view === "visual" ? "contained" : "outlined"
            }
            onClick={() =>
              vpManager.functions.setExtras(viewport.name, {
                ...viewport.extra,
                view: "visual",
              })
            }
          >
            Visual
          </Button>
          <Button
            variant={viewport.extra.view === "model" ? "contained" : "outlined"}
            onClick={() =>
              vpManager.functions.setExtras(viewport.name, {
                ...viewport.extra,
                view: "model",
              })
            }
          >
            Modelo
          </Button>
        </ButtonGroup>
        <Box id="view">
          {viewport.extra.view === "visual" ? <VisualView /> : <ModelView />}
        </Box>
      </Box>
    </>
  );
}
