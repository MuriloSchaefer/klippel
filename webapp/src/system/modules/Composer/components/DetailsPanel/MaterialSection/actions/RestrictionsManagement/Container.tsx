import { Box } from "@mui/material";
import { PointerContainerProps } from "@kernel/modules/Pointer/components/PointerContainer";

import { CompositionState } from "../../../../../store/composition/state";
import RestrictionsSection from "./RestrictionsSection";
import RecommendationsSection from "./RecommendationsSection";

export interface RestrictionsProps extends PointerContainerProps {
  compositionState: CompositionState;
  materialUsageId: string;
}

const AddRestrictionContainer = (props: RestrictionsProps) => {
  if (!props.isOpen) return <div></div>
  return (
    <Box role="link-material-container" sx={{ height: "max-content", display:'flex', gap: 2, justifyContent: 'space-between', flexDirection: 'column', padding: 1 }}>
      <RestrictionsSection {...props} />
      <RecommendationsSection {...props} />
    </Box>
  );
};

export default AddRestrictionContainer;
