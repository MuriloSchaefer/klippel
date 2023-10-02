import { useCallback, useContext } from "react";
import IconButton from "@mui/material/IconButton";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IPointerModule } from "@kernel/modules/Pointer";
import { ConfirmButtonProps } from "@kernel/modules/Pointer/components/ConfirmAndCloseButton";

import { ProcessActionProps } from "../ProcessActions";
import { CompositionState } from '../../../../store/composition/state';
import useComposition, { Composition } from '../../../../hooks/useComposition';
import TuneSharpIcon from '@mui/icons-material/TuneSharp';

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
          <>div</>
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
