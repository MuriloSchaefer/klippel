import React from "react";

import Box from "@mui/material/Box";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { ViewportState } from "@kernel/modules/Layout/store/viewports/state";


import SettingsPanel from "./SettingsPanel";
import { CONVERSION_GRAPH_NAME } from "../../constants";
import Viewer from "./Viewer";
import DetailsPanel from "./DetailsPanel";

const ConverterGraphViewport = ({ name }: ViewportState) => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ViewportNotificationsTray } =
    layoutModule.components;

  return (
    <Box
      role="converter-graph-viewport"
      sx={{
        padding: 1,
        height: "100%",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Viewer graphId={CONVERSION_GRAPH_NAME} />

      <ViewportNotificationsTray>
        <></>
      </ViewportNotificationsTray>

      <SettingsPanel />

      <DetailsPanel />
    </Box>
  );
};

export default React.memo(ConverterGraphViewport);
