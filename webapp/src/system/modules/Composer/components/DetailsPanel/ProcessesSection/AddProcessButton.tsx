import { useCallback, useState } from "react";
import { Box, Button, TextField } from "@mui/material";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";

import { IConverterModule } from "@system/modules/Converter";

import useComposition from "../../../hooks/useComposition";
import { OperationNode } from "../../../store/composition/state";

type AddOperationPayload = Omit<OperationNode, 'id'|'type'|'position'>

export const AddProcessButton = ({
  compositionName,
}: {
  compositionName: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const converterModule = useModule<IConverterModule>("Converter");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ScaleSlider } = converterModule.components;

  const composition = useComposition(compositionName, (c) => c?.selectedPart);

  const [operation, setOperation] = useState<AddOperationPayload>({
    label: "",
    cost: { amount: 0, unit: "R$" },
    time_taken: { amount: 0, unit: "h" },
  });

  const handleConfirm = useCallback(() => {
    if (composition.state)
      composition.actions.addOperation(
        operation.label,
        operation.cost,
        operation.time_taken,
        composition.state
      );
  }, [operation]);

  return (
    <PointerContainer
      component={
        <Box sx={{ display: "flex", flexDirection: "column", flexGrow: 2 }}>
          <TextField
            id="operation-name"
            label="Nome"
            variant="standard"
            sx={{ marginBottom: 1 }}
            onChange={(evt) =>
              setOperation((old) => ({ ...old, label: evt.target.value }))
            }
          />
          <ScaleSlider
            scale="time"
            label="Tempo"
            icon={<AccessTimeSharpIcon />}
            onChange={(v) => setOperation((old) => ({ ...old, time_taken: v }))}
          />
          <ScaleSlider
            scale="money"
            label="Custo"
            icon={<AttachMoneySharpIcon />}
            onChange={(v) => setOperation((old) => ({ ...old, cost: v }))}
          />
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
        Adicionar processo
      </Button>
    </PointerContainer>
  );
};

export default AddProcessButton;
