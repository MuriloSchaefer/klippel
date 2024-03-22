import { useCallback, useEffect, useState } from "react";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import Input from "@mui/material/Input";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import UnitSelector from "../../../UnitSelector";
import type { ConvertsToEdge } from "../../../../typings";
import useConverterManager from "../../../../hooks/useConverterManager";

type ConversionForm = {
  type: ConvertsToEdge["conversionType"];
  from?: string;
  to?: string;
  factor?: number;
  expression?: string;
};

export default ({ from = "", to = "" }: { from?: string; to?: string }) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const converter = useConverterManager((c) => c);

  const [form, setForm] = useState<ConversionForm>({
    type: "factor",
    from: from,
    to: to,
    factor: 1,
    expression: "quantidade * 1"
  });

  useEffect(() => setForm((f) => ({ ...f, from, to })), [from, to]);

  const handleConfirm = useCallback(() => {
    if (form.from && form.to) {
      converter.addConversion(
        form.type,
        form.from,
        form.to,
        form.factor,
        form.expression
      );
    }
  }, [form]);

  return (
    <PointerContainer
      component={
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
          role="conversion-form"
        >
          <Box
            role="conversion-type"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
            }}
          >
            <ToggleButtonGroup
              color="primary"
              value={form.type}
              exclusive
              onChange={(evt, value) =>
                setForm((curr) => ({
                  ...curr,
                  type: value as ConvertsToEdge["conversionType"],
                }))
              }
              aria-label="Platform"
            >
              <ToggleButton value="factor">Fator</ToggleButton>
              <ToggleButton value="expresssion">Expressão</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <Box
            role="from-conversion"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography sx={{ minWidth: 30 }}>De:</Typography>
            <UnitSelector
              value={form.from}
              disabled={!!from}
              filterUnits={(unit) => unit.id !== form.to}
              onChange={(evt) =>
                setForm((f) => ({ ...f, from: evt.target.value }))
              }
            />
          </Box>
          <Box
            role="to-conversion"
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography sx={{ minWidth: 30 }}>Para:</Typography>
            <UnitSelector
              value={form.to}
              disabled={!!to}
              filterUnits={(unit) => unit.id !== form.from}
              onChange={(evt) =>{
                console.log('changing')

                setForm((f) => ({ ...f, to: evt.target.value }))
              }
              }
            />
          </Box>
          <Box>
            {form.type === "factor" ? (
              <Box
                role="factor-field"
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography sx={{ minWidth: 30 }}>Fator</Typography>
                <Input
                  value={form.factor}
                  type="number"
                  onChange={(evt) =>
                    setForm((f) => ({ ...f, factor: +evt.target.value }))
                  }
                  startAdornment={
                    <InputAdornment position="start">1:</InputAdornment>
                  }
                />
              </Box>
            ) : (
              <>
                <Box
                  role="expression-field"
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ minWidth: 30 }}>Exp</Typography>
                  <Input
                    value={form.expression}
                    onChange={(evt) =>
                      setForm((f) => ({ ...f, expression: evt.target.value }))
                    }
                    startAdornment={
                      <InputAdornment position="start">=</InputAdornment>
                    }
                  />
                </Box>
                <Typography sx={{ marginTop: 1 }}>
                  quantidade é a única variável pré-definida, é utilizada para
                  definir a quantidade a ser convertida. Há suas variantes
                  quantidadeQuociente e quantidadeDividendo para unidades
                  compostas
                </Typography>
              </>
            )}
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" handleConfirm={handleConfirm} />,
      ]}
    >
      <Button
        startIcon={<AddSharpIcon />}
        variant="outlined"
        size="small"
        sx={{ marginBottom: 1 }}
      >
        Adicionar Conversão
      </Button>
    </PointerContainer>
  );
};
