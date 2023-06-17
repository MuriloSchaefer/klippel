import {
  IconButton,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";

import { IPointerModule } from "@kernel/modules/Pointer";
import LinkSharpIcon from "@mui/icons-material/LinkSharp";
import LinkMaterialContainer from "./LinkMaterialContainer";

import useComposition from "../../../../hooks/useComposition";

const LinkMaterialButton = ({
  compositionName,
  materialUsageId,
}: MaterialActionProps) => {
  const composition = useComposition(compositionName, (c) => c);
  const pointerModule = useModule<IPointerModule>("Pointer");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  if (!composition.state) return <></>;

  return (
    <>
      <PointerContainer
        component={
          <LinkMaterialContainer
            compositionState={composition.state}
            materialUsageId={materialUsageId}
          />
        }
        actions={[
          <ConfirmAndCloseButton
            color="success"
            key="accept"
            handleConfirm={() => null}
          />,
        ]}
      >
        <IconButton
          key="configure"
          id="configure-material"
          sx={{ flexGrow: 2 }}
        >
          <LinkSharpIcon />
        </IconButton>
      </PointerContainer>
    </>
  );
};

export default LinkMaterialButton;
