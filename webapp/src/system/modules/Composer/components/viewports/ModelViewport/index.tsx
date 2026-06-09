import MaterialListAccordion from "../MaterialListAccordion";
import LogoListAccordion from "../LogoListAccordion";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import {
  MATERIAL_LIST_CONTEXT_ID,
  MODULE_NAME,
  PROCESS_TIME_LIST_CONTEXT_ID,
  LOGO_LIST_CONTEXT_ID,
} from "../../../constants";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import CompositionTree from "../CompositionTree/CompositionTree";
import LeaseStatusRow from "./LeaseStatusRow";
import SVGView from "./SVGView";
import GraphView from "./GraphView";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import GestureSharpIcon from "@mui/icons-material/GestureSharp";
import DetailPanel from "./DetailPanel";
import WidgetsSharpIcon from "@mui/icons-material/WidgetsSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import PaidSharpIcon from "@mui/icons-material/PaidSharp";
import ProcessTimeAccordion from "../ProcessTimeAccordion";
import ProcessCostAccordion from "../ProcessCostAccordion";
import { ISVGModule } from "@kernel/modules/SVG";
import { ErrorBoundary } from "react-error-boundary";
import { fallbackRender } from "@kernel/App";
import React, { useMemo } from "react";
import ViewportNotificationsTray from "@kernel/modules/Layout/components/SystemTray/ViewportNotificationsTray";

function ModelViewport() {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const svgModule = useModule<ISVGModule>("SVG");
  const keyboardShortcuts =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider, FocusShortcutProvider, ShortcutHint } =
    keyboardShortcuts.components;
  const { SettingsPanel, Accordion, DetailsPanel } = layoutModule.components;

  const { useActiveViewport, useViewportManager } = layoutModule.hooks;
  const { SVGEditorToolkit } = svgModule.components;

  const activeVP = useActiveViewport();
  const vpManager = useViewportManager();

  const variationId = activeVP.extra.variationId as string;

  const view = useMemo(() => {
    switch (activeVP.extra.view) {
      case "svg":
        return <SVGView variationId={variationId} />;
      case "graph":
        return <GraphView variationId={variationId} />;
      default:
        return <>Erro! tipo de visualização não encontrada</>;
    }
  }, [activeVP.extra.view, variationId]);

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
            <LeaseStatusRow variationId={variationId} />
          </ViewportNotificationsTray>

          <SettingsPanel>
            <Accordion
              name="Composição"
              icon={<AccountTreeSharpIcon />}
              summary="composição da peça"
            >
              <CompositionTree variationId={variationId} />
            </Accordion>
            <FocusShortcutProvider contextId={MATERIAL_LIST_CONTEXT_ID}>
              <Accordion
                shortcutHint={`${MODULE_NAME}/MaterialList/focus`}
                name="Materiais"
                icon={<WidgetsSharpIcon />}
                summary="Materiais referenciados na composição"
              >
                <MaterialListAccordion variationId={variationId} />
              </Accordion>
            </FocusShortcutProvider>
            <FocusShortcutProvider contextId={PROCESS_TIME_LIST_CONTEXT_ID}>
              <Accordion
                shortcutHint={`${MODULE_NAME}/ProcessTimeList/focus`}
                name="Tempo"
                icon={<AccessTimeSharpIcon />}
                summary="Resumo de tempo por processo"
              >
                <ProcessTimeAccordion variationId={variationId} />
              </Accordion>
            </FocusShortcutProvider>
            <Accordion
              name="Custo"
              icon={<PaidSharpIcon />}
              summary="Resumo de custo por processo"
            >
              <ProcessCostAccordion variationId={variationId} />
            </Accordion>
            <FocusShortcutProvider contextId={LOGO_LIST_CONTEXT_ID}>
              <Accordion
                shortcutHint={`${MODULE_NAME}/LogoList/focus`}
                name="Logos"
                icon={<ImageOutlinedIcon />}
                summary="Logos (bordado / serigrafia)"
              >
                <LogoListAccordion variationId={variationId} />
              </Accordion>
            </FocusShortcutProvider>
          </SettingsPanel>

          <DetailsPanel>
            <DetailPanel
              variationId={variationId}
              selectedPart={activeVP.extra.selectedPart}
            />
          </DetailsPanel>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              alignItems: "center",
              p: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Box sx={{ flex: 1 }} />

            <ToggleButtonGroup
              size="small"
              exclusive
              value={activeVP.extra.view}
              onChange={(_e, v) => {
                if (v)
                  vpManager.functions.setExtras(activeVP.name, {
                    ...activeVP.extra,
                    view: v,
                  });
              }}
              aria-label="alterar modo de visualização"
            >
              <ShortcutHint
                shortcutId={`${MODULE_NAME}/ModelViewport/viewAsGraph`}
              >
                <ToggleButton
                  value="graph"
                  id="composer-view-graph"
                  data-testid="composer-view-graph"
                  aria-label="Grafo"
                >
                  <AccountTreeSharpIcon fontSize="small" />
                </ToggleButton>
              </ShortcutHint>
              <ShortcutHint
                shortcutId={`${MODULE_NAME}/ModelViewport/viewAsSVG`}
              >
                <ToggleButton
                  value="svg"
                  id="composer-view-svg"
                  data-testid="composer-view-svg"
                  aria-label="Desenho"
                >
                  <GestureSharpIcon fontSize="small" />
                </ToggleButton>
              </ShortcutHint>
            </ToggleButtonGroup>
          </Box>

          <Box
            id="composer-active-view"
            data-active-view={activeVP.extra.view}
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <ErrorBoundary fallbackRender={fallbackRender}>
              {view}
            </ErrorBoundary>
          </Box>
        </Box>
      </ShortcutProvider>
    </SVGEditorToolkit>
  );
}

export default React.memo(ModelViewport);
