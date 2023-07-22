import {
  IconButton,
  IconButtonProps,
} from "@mui/material";
import EnhancedEncryptionSharpIcon from '@mui/icons-material/EnhancedEncryptionSharp';

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { ILayoutModule } from "@kernel/modules/Layout";

import useComposition from "../../../../../hooks/useComposition";
import AddRestrictionContainer from "./Container";
import { MaterialActionProps } from "../types";

interface Props extends MaterialActionProps, IconButtonProps {}

const AddRestrictionButton = ({sx, materialUsageId, compositionName, ...props}: Props) => {
  const composition = useComposition(compositionName, (c) => c);
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { PointerContainer } = pointerModule.components;
  const { CRUDGridProvider } = layoutModule.components;

  if (!composition.state) return <></>;

  return (
    <CRUDGridProvider initialRows={[]}>
      <PointerContainer
        component={
          <AddRestrictionContainer
            compositionState={composition.state}
            materialUsageId={materialUsageId}
          />
        }
        actions={[]}
      >
        <IconButton
          key="restrict"
          id="restrict-material"
          sx={{ flexGrow: 2 }}
        >
          <EnhancedEncryptionSharpIcon />
        </IconButton>
      </PointerContainer>
    </CRUDGridProvider>
  );
};

export default AddRestrictionButton;
