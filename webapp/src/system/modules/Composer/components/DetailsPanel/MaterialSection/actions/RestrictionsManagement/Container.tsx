import { Box } from "@mui/material";

import { CompositionState } from "../../../../../store/composition/state";
import RestrictionsSection from "./RestrictionsSection";
import RecommendationsSection from "./RecommendationsSection";

export interface RestrictionsProps {
  compositionState: CompositionState;
  materialUsageId: string;
}

const AddRestrictionContainer = (props: RestrictionsProps) => {
  return (
    <Box role="link-material-container" sx={{ height: "max-content", display:'flex', gap: 2, justifyContent: 'space-between', flexDirection: 'column', padding: 1 }}>
      <RestrictionsSection {...props} />
      <RecommendationsSection {...props} />
    </Box>
  );
};

export default AddRestrictionContainer;
