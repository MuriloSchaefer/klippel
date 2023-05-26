import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ViewportStateSelector } from "@kernel/modules/Layout/store/viewports/selectors";
import { Box } from "@mui/material";
import React, { useMemo } from "react";
import useCompositionsManager from "../hooks/useCompositionsManager";

const DebuggerViewport = ({ name }: ViewportStateSelector) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ViewportNotificationsTray, DetailsPanel, SettingsPanel, Accordion } =
    layoutModule.components;

  const {
    components: { GraphViewer },
  } = graphModule;

  const compositionsManager = useCompositionsManager();
  const composition = useMemo(
    () =>
      compositionsManager.functions.findComposition(
        (c) => c.debugViewport === name
      ),
    [name]
  );

  return (
    <Box
      role="composer-debugger-viewport"
      sx={{
        padding: 1,
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {composition && (
        <GraphViewer graphId={composition?.graphId} />
      )}

      <ViewportNotificationsTray>
        <></>
      </ViewportNotificationsTray>

      <SettingsPanel title="Configurações">
        <Accordion name="Tipos de nodos" summary="Tipos de nodos disponiveis">
          <></>
        </Accordion>
        <></>
      </SettingsPanel>

      <DetailsPanel>
        <></>
      </DetailsPanel>
    </Box>
  );
};

export default React.memo(DebuggerViewport);
