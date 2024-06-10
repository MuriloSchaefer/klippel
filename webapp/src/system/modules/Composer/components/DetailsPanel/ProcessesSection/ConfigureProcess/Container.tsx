import Box from "@mui/material/Box";

import type { PointerContainerProps } from "@kernel/modules/Pointer/components/PointerContainer";

import type { CompositionState } from "../../../../store/composition/state";
import MaterialsSection from "./MaterialsSection";

export interface ConfigProcessProps extends PointerContainerProps {
  compositionState: CompositionState;
  processId: string;
}

const ConfigProcessContainer = (props: ConfigProcessProps) => {
  return (
    <Box
      role="material-usage-container"
      sx={{
        height: "max-content",
        display: "flex",
        gap: 2,
        justifyContent: "space-between",
        flexDirection: "column",
        padding: 1,
      }}
    >
      <MaterialsSection {...props} />
      {/* <RecommendationsSection {...props} /> */}
    </Box>
  );
};

export default ConfigProcessContainer;
