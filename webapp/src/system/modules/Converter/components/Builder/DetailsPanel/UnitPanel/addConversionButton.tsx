import { useCallback, useState } from "react";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";

import UnitSelector from "../../../UnitSelector";
import type {
  ConvertsToEdge,
} from "../../../../typings";

type ConversionForm = {
  type: ConvertsToEdge["conversionType"];
  from?: string;
  to?: string;
};

export default ({ from, to }: { from?: string; to?: string }) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const [form, setForm] = useState<ConversionForm>({
    type: "factor",
    from: from,
    to: to,
  });

  const handleConfirm = useCallback(() => {
    console.log("test");
  }, []);

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
              <ToggleButton value="">Fator</ToggleButton>
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
            <UnitSelector />
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
            <UnitSelector value={form.to} disabled={!!to} />
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
