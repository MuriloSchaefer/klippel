import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { Box, Button, TextField } from "@mui/material";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import { useCallback, useState } from "react";
import useComposition from "../../../../hooks/useComposition";
import { MaterialActionProps } from "./types";


export const AddMaterialButton = ({compositionName}: MaterialActionProps) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const composition = useComposition(compositionName, (c) => c?.selectedPart);

  const [label, setLabel] = useState<string>("")

  const handleConfirm = useCallback(()=>{
    if (composition.state){
      composition.actions.addMaterialUsage(label, composition.state)
    }
  }, [label])
  
  return (
    <PointerContainer
      component={
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 2 }}>
          <TextField id="material-usage-name" label="Nome" variant="standard" value={label} onChange={(e)=>setLabel(e.target.value)} />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          color="success"
          key="accept"
          handleConfirm={handleConfirm}
        />,
      ]}
    >
      <Button
        startIcon={<AddSharpIcon />}
        variant="outlined"
        size="small"
        sx={{ marginBottom: 1 }}
      >
        Adicionar material
      </Button>
    </PointerContainer>
  );
};

export default AddMaterialButton;
