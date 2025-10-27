import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import CompositionTree from "../CompositionTree/CompositionTree";
import useVariation from "../../../hooks/useVariation";
import SVGView from "./SVGView";
import GraphView from "./GraphView";
import { useMemo } from "react";
import { Box, Button, ButtonGroup } from "@mui/material";
import { select } from "d3";

export default function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ViewportNotificationsTray, SettingsPanel, Accordion } =
    layoutModule.components;

  const { useActiveViewport, useViewportManager } = layoutModule.hooks;

  const activeVP = useActiveViewport();
  const vpManager = useViewportManager();

  const variation = useVariation({ variationId: activeVP.extra.variationId });

  const view = useMemo(() => {
    console.log(activeVP.extra.view)
    switch (activeVP.extra.view) {
      case "svg":
        return <SVGView variationId={activeVP.extra.variationId as string} />;
      case "graph":
        return <GraphView variationId={activeVP.extra.variationId as string} />;
      default:
        return <>Erro! tipo de visualização não encontrada</>;
    }
  }, [activeVP.extra.view, activeVP.extra.variationId]);

  return (
    <Box
      sx={{
        position: "relative",
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
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

      {view}

      <Box sx={{ position: "absolute", top: 16, left: 16 }}>
        <ButtonGroup
          variant="contained"
          aria-label="alterar modo de visualização"
        >
          <Button
            onClick={() => {
              vpManager.functions.setExtras(activeVP.name, {
                ...activeVP.extra,
                view: "graph",
              });
            }}
            variant={activeVP.extra.view === "graph" ? "outlined" : "contained"}
          >
            Grafo
          </Button>
          <Button
            onClick={() => {
              vpManager.functions.setExtras(activeVP.name, {
                ...activeVP.extra,
                view: "svg",
              });
            }}
            variant={activeVP.extra.view === "svg" ? "outlined" : "contained"}
          >
            Desenho
          </Button>
        </ButtonGroup>
      </Box>
    </Box>
  );
}
