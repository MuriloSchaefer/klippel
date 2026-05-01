// Removed duplicate import of useModule
import MaterialListAccordion from "../MaterialListAccordion";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../../constants";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import CompositionTree from "../CompositionTree/CompositionTree";
import useVariation from "../../../hooks/useVariation";
import SVGView from "./SVGView";
import GraphView from "./GraphView";
import { Box, Button, ButtonGroup } from "@mui/material";
import DetailPanel from "./DetailPanel";
import WidgetsSharpIcon from "@mui/icons-material/WidgetsSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import ProcessTimeAccordion from "../ProcessTimeAccordion";
import { ISVGModule } from "@kernel/modules/SVG";
import { ErrorBoundary } from "react-error-boundary";
import { fallbackRender } from "@kernel/App";
import React, { useMemo } from "react";

function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const svgModule = useModule<ISVGModule>("SVG");
  const keyboardShortcuts = useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider, ShortcutHint } = keyboardShortcuts.components;
  const { ViewportNotificationsTray, SettingsPanel, Accordion, DetailsPanel } =
    layoutModule.components;

  const { useActiveViewport, useViewportManager } = layoutModule.hooks;
  const { SVGEditorToolkit } = svgModule.components;

  const activeVP = useActiveViewport();
  const vpManager = useViewportManager();

  const variation = useVariation({ variationId: activeVP.extra.variationId });

  const view = useMemo(() => {
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
    <SVGEditorToolkit>
      <ShortcutProvider contextId={`${MODULE_NAME}/ModelViewport`}>
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
          <ShortcutHint
            shortcutId={`${MODULE_NAME}/MaterialList/focus`}
            placement="top-right"
          >
            <Accordion
              name="Materiais"
              icon={<WidgetsSharpIcon />}
              summary="Materiais referenciados na composição"
            >
              <MaterialListAccordion variationId={activeVP.extra.variationId} />
            </Accordion>
          </ShortcutHint>
          <Accordion
            name="Tempo"
            icon={<AccessTimeSharpIcon />}
            summary="Resumo de tempo por processo"
          >
            <ProcessTimeAccordion variationId={activeVP.extra.variationId} />
          </Accordion>
        </SettingsPanel>

        <DetailsPanel>
          <DetailPanel
            variationId={activeVP.extra.variationId}
            selectedPart={activeVP.extra.selectedPart}
          />
        </DetailsPanel>

        <ErrorBoundary fallbackRender={fallbackRender}>{view}</ErrorBoundary>

        <Box sx={{ position: "absolute", top: 16, left: 16 }}>
          <ButtonGroup
            variant="contained"
            aria-label="alterar modo de visualização"
          >
            <ShortcutHint
              shortcutId={`${MODULE_NAME}/ModelViewport/viewAsGraph`}
              placement="bottom-right"
            >
              <Button
                id="composer-view-graph"
                onClick={() => {
                  vpManager.functions.setExtras(activeVP.name, {
                    ...activeVP.extra,
                    view: "graph",
                  });
                }}
                variant={"contained"}
              >
                Grafo
              </Button>
            </ShortcutHint>
            <ShortcutHint
              shortcutId={`${MODULE_NAME}/ModelViewport/viewAsSVG`}
              placement="bottom-right"
            >
              <Button
                id="composer-view-svg"
                onClick={() => {
                  vpManager.functions.setExtras(activeVP.name, {
                    ...activeVP.extra,
                    view: "svg",
                  });
                }}
                sx={{
                  ":hover": { cursor: "pointer", color: "primary.main" },
                }}
                variant={"contained"}
              >
                Desenho
              </Button>
            </ShortcutHint>
          </ButtonGroup>
        </Box>
      </Box>
      </ShortcutProvider>
    </SVGEditorToolkit>
  );
}

export default React.memo(ModelViewport);
