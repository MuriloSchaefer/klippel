import Box from '@mui/material/Box';

import { PointerContainerProps } from "@kernel/modules/Pointer/components/PointerContainer";

import { CompositionState } from "../../../../../store/composition/state";
import RestrictionsSection from "./RestrictionsSection";

export interface RestrictionsProps extends PointerContainerProps {
  compositionState: CompositionState;
  materialUsageId: string;
}

const AddRestrictionContainer = (props: RestrictionsProps) => {
  return (
    <Box role="add-restriction-container" sx={{ height: "max-content", display:'flex', gap: 2, justifyContent: 'space-between', flexDirection: 'column', padding: 1 }}>
      <RestrictionsSection {...props} />
      {/* <RecommendationsSection {...props} /> */}
    </Box>
  );
};

export default AddRestrictionContainer;
