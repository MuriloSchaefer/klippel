import { FormEvent, useCallback, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";

import type { IConverterModule } from "@system/modules/Converter";

import useComposition from "../../../hooks/useComposition";
import { OperationNode } from "../../../store/composition/state";
import _ from "lodash";

type AddOperationPayload = Omit<OperationNode, "id" | "type" | "position">;

export const AddProcessButton = ({
  compositionName,
}: {
  compositionName: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const converterModule = useModule<IConverterModule>("Converter");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { CompoundSelector } = converterModule.components;

  const composition = useComposition({compositionName}, (c) => c?.selectedPart);

  const formId = useMemo(() => _.uniqueId("new-process-form"), []);
  const [operation, setOperation] = useState<AddOperationPayload>({
    label: "",
    cost: {
      quotient: { amount: 1, unit: "reais11" },
      dividend: { amount: 1, unit: "unitario18" },
    },
    time_taken: {
      quotient: { amount: 1, unit: "minutos249" },
      dividend: { amount: 1, unit: "unitario18" },
    },
  });

  const handleSubmission = useCallback(
    () => {
      if (composition.state)
        composition.actions.addOperation(
          operation.label,
          operation.cost,
          operation.time_taken,
          composition.state
        );
    },
    [operation, composition]
  );

  return (
    <PointerContainer
      component={        
        <Box
          component={"form"}
          id={formId}
          sx={{ display: "flex", flexDirection: "column", flexGrow: 2, gap: 1 }}
        >
          <FormControl>
            <TextField
              id="name"
              label="Nome"
              variant="standard"
              sx={{ marginBottom: 1 }}
              onChange={(evt) =>
                setOperation((old) => ({ ...old, label: evt.target.value }))
              }
              value={operation.label}
            />
          </FormControl>
          <CompoundSelector
            id="time-taken"
            label="Tempo"
            filterDividends={(unit) => unit.abbreviation === "un"}
            filterQuotients={(_, scale)=> scale?.name === 'Temporal'}
            value={operation.time_taken}
            onChange={(v) => setOperation((old) => ({ ...old, time_taken: v }))}
          />
          <CompoundSelector
            id="cost"
            label="Custo"
            filterDividends={(unit, scale) => unit.abbreviation === "un" || scale?.name == 'Temporal'}
            filterQuotients={(_, scale)=> scale?.name === 'Monetaria'}
            value={operation.cost}
            onChange={(v) => setOperation((old) => ({ ...old, cost: v }))}
          />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          form={formId}
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={handleSubmission}
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
