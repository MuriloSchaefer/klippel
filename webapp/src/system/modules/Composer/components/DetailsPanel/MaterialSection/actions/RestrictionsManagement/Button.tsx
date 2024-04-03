import { useCallback, useContext } from "react";


import {IconButtonProps} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import EnhancedEncryptionSharpIcon from "@mui/icons-material/EnhancedEncryptionSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IPointerModule } from "@kernel/modules/Pointer";
import { ConfirmButtonProps } from "@kernel/modules/Pointer/components/ConfirmAndCloseButton";

import AddRestrictionContainer from "./Container";
import { MaterialActionProps } from "../types";
import {
  CompositionState,
} from "../../../../../store/composition/state";
import useComposition, {
  Composition,
} from "../../../../../hooks/useComposition";

interface ConfirmProps extends Omit<ConfirmButtonProps, "handleConfirm"> {
  materialUsageId: string;
  composition: Composition<CompositionState | undefined>;
}

const ConfirmButton = ({
  composition,
  materialUsageId,
  ...props
}: ConfirmProps) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ConfirmAndCloseButton } = pointerModule.components;
  const { CRUDGridContext } = layoutModule.contexts;
  const { rows } = useContext(CRUDGridContext);

  const handleConfirm = useCallback(() => {
    console.group("delete");
    rows
      .filter((r) => r.state === "deleted")
      .forEach((r) =>
        composition.actions.removeRestriction(materialUsageId, r.id)
      );
    console.groupEnd();
    console.group("modified");
    rows
      .filter((r) => r.state === "modified")
      .forEach((r) => {
        composition.actions.updateRestriction(materialUsageId, r.id, r);
      });
    console.groupEnd();
    console.group("added");
    rows
      .filter((r) => r.state === "added")
      .forEach((r) => {
        composition.actions.addRestriction(materialUsageId, {
          type: "RESTRICTION",
          id: r.id,
          label: r.label,
          operand: r.operand,
          position: r.position,
          restrictionType: r.restrictionType,
          attribute: r.attribute,
        });
      });
    console.groupEnd();
  }, [rows]);

  return (
    <ConfirmAndCloseButton
      color="success"
      {...props}
      handleConfirm={handleConfirm}
    />
  );
};

interface Props extends MaterialActionProps, IconButtonProps {}
const AddRestrictionButton = ({
  sx,
  materialUsageId,
  compositionName,
  ...props
}: Props) => {
  const composition = useComposition({compositionName}, (c) => c);
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
        actions={[
          <ConfirmButton
            composition={composition}
            materialUsageId={materialUsageId}
            key="accept"
          />,
        ]}
      >
        <IconButton key="restrict" id="restrict-material" sx={{ flexGrow: 2 }}>
          <EnhancedEncryptionSharpIcon />
        </IconButton>
      </PointerContainer>
    </CRUDGridProvider>
  );
};

export default AddRestrictionButton;
