import { useCallback, useContext } from "react";
import IconButton from "@mui/material/IconButton";
import TuneSharpIcon from '@mui/icons-material/TuneSharp';

import useModule from "@kernel/hooks/useModule";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { ConfirmButtonProps } from "@kernel/modules/Pointer/components/ConfirmAndCloseButton";

import type { ProcessActionProps } from "../ProcessActions";
import type { CompositionState } from '../../../../store/composition/state';
import useComposition, { Composition } from '../../../../hooks/useComposition';
import ConfigProcessContainer from "./Container";

interface ConfirmProps extends Omit<ConfirmButtonProps, "handleConfirm"> {
    processId: string;
  composition: Composition<CompositionState | undefined>;
}

const ConfirmButton = ({
  composition,
  processId,
  ...props
}: ConfirmProps) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ConfirmAndCloseButton } = pointerModule.components;
  const { CRUDGridContext } = layoutModule.contexts;
  const { rows } = useContext(CRUDGridContext);

  const handleConfirm = useCallback(() => {
    rows.filter(r => r.state === "deleted").forEach(edge => {
      composition.actions.deleteMaterialConsuption(edge.id)
    })

    rows.filter(r => r.state === "modified").forEach(({id, targetId, quantity}) => {
      composition.actions.updateMaterialConsuption(id, {targetId, quantity})
    })

    rows.filter(r => r.state === "added").forEach(edge => {
      composition.actions.addMaterialConsuption(processId, edge.targetId, edge.quantity)
    })

  }, [rows]);

  return (
    <ConfirmAndCloseButton
      color="success"
      {...props}
      handleConfirm={handleConfirm}
    />
  );
};

const ConfigureProcessButton = ({
  sx,
  compositionName,
  processId,
  ...props
}: ProcessActionProps) => {
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
          <ConfigProcessContainer processId={processId} compositionState={composition.state} />
        }
        actions={[
          <ConfirmButton
            composition={composition}
            processId={processId}
            key="accept"
          />,
        ]}
      >
        <IconButton color="default" key="configure" id="configure-process" sx={{flexGrow: 2}}>
            <TuneSharpIcon />
        </IconButton>
      </PointerContainer>
    </CRUDGridProvider>
  );
};

export default ConfigureProcessButton;
