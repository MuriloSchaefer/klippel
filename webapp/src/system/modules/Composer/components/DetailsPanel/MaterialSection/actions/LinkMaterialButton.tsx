import { useCallback, useContext } from "react";

import IconButton from "@mui/material/IconButton";
import LinkSharpIcon from "@mui/icons-material/LinkSharp";

import { ConfirmButtonProps } from "@kernel/modules/Pointer/components/ConfirmAndCloseButton";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { ILayoutModule } from "@kernel/modules/Layout";

import useComposition, { Composition } from "../../../../hooks/useComposition";
import { CompositionState } from "../../../../store/composition/state";
import LinkMaterialContainer from "./LinkMaterialContainer";
import { MaterialActionProps } from "./types";

interface ConfirmProps extends Omit<ConfirmButtonProps, 'handleConfirm'> {materialUsageId:string, composition: Composition<CompositionState | undefined>}

const ConfirmButton = ({composition,materialUsageId, ...props}: ConfirmProps) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { ConfirmAndCloseButton } = pointerModule.components;
  const { CRUDGridContext } = layoutModule.contexts;
  const { rows } = useContext(CRUDGridContext);

  const handleConfirm = useCallback(() => {
    rows.filter(r => r.state === 'deleted').forEach(r => composition.actions.deleteProxy(r.elem, materialUsageId))
    rows.filter(r => r.state === 'modified').forEach(r => {
      composition.actions.deleteProxy(r.old.elem, materialUsageId)
      if (r.stroke)
        composition.actions.addProxy({elem:r.elem, attr: 'stroke' }, materialUsageId)
      if (r.fill)
        composition.actions.addProxy({elem:r.elem, attr: 'fill' }, materialUsageId)
    })
    rows.filter(r => r.state === 'added').forEach(r => {
      composition.actions.deleteProxy(r.elem, materialUsageId)
      if (r.stroke)
        composition.actions.addProxy({elem:r.elem, attr: 'stroke' }, materialUsageId)
      if (r.fill)
        composition.actions.addProxy({elem:r.elem, attr: 'fill' }, materialUsageId)
    })
  }, [rows]);

  return (
    <ConfirmAndCloseButton color="success"  {...props} handleConfirm={handleConfirm} />
  );
};

const LinkMaterialButton = ({
  compositionName,
  materialUsageId,
}: MaterialActionProps) => {
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
          <LinkMaterialContainer
            compositionState={composition.state}
            materialUsageId={materialUsageId}
          />
        }
        actions={[<ConfirmButton composition={composition} materialUsageId={materialUsageId} key="accept" />]}
      >
        <IconButton
          key="configure"
          id="configure-material"
          sx={{ flexGrow: 2 }}
        >
          <LinkSharpIcon />
        </IconButton>
      </PointerContainer>
    </CRUDGridProvider>
  );
};

export default LinkMaterialButton;
