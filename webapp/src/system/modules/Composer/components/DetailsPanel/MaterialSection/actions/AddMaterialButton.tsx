import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";

import type { IMaterialsModule } from "@system/modules/Materials";

import useComposition from "../../../../hooks/useComposition";

const Container = ({
  labelState: [label, setLabel],
  materialTypes,
  handleMaterialTypeChange,
}: {
  labelState: [string, React.Dispatch<React.SetStateAction<string>>];
  materialTypes: string[];
  handleMaterialTypeChange: (event: any) => void;
}) => {
  const {
    components: { MaterialTypeSelector },
  } = useModule<IMaterialsModule>("Materials");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 2 }}>
      <MaterialTypeSelector
        value={materialTypes}
        onChange={handleMaterialTypeChange}
        multiple
      />
      <TextField
        id="material-usage-name"
        label="Nome"
        variant="standard"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
    </Box>
  );
};

export const AddMaterialButton = ({
  compositionName,
}: {
  compositionName: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const composition = useComposition(
    { compositionName },
    (c) => c?.selectedPart
  );

  const [label, setLabel] = useState<string>("");
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);

  const handleConfirm = useCallback(() => {
    if (composition.state) {
      composition.actions.addMaterialUsage(
        label,
        composition.state,
        materialTypes
      );
    }
  }, [label]);

  const handleMaterialTypeChange = useCallback(
    (event: any) => setMaterialTypes((old) => event.target.value),
    [compositionName]
  );

  return (
    <PointerContainer
      component={
        <Container
          materialTypes={materialTypes}
          handleMaterialTypeChange={handleMaterialTypeChange}
          labelState={[label, setLabel]}
        />
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
