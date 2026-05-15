import React, { useState } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { IConverterModule } from "@system/modules/Converter";
import { CompoundValue } from "@system/modules/Converter/typings";
import useVariation from "../../../hooks/useVariation";
import { MODULE_NAME } from "../../../constants";
import { snapCostTime } from "../../../utils/snapCostTime";

export default function AddProcessButton({
  variationId,
}: Readonly<{ variationId: string }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const converterModule = useModule<IConverterModule>("Converter");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { CompoundSelector } = converterModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const variation = useVariation({ variationId });

  const [form, setForm] = useState<{
    name: string;
    costTime: CompoundValue;
    costMoney: CompoundValue;
  }>({
    name: "",
    costTime: {
      quotient: { amount: 1, unit: "unitario18" },
      dividend: { amount: 1, unit: "minutos249" },
    },
    costMoney: {
      quotient: { amount: 1, unit: "reais11" },
      dividend: { amount: 1, unit: "unitario18" },
    },
  });

  const resetForm = () => {
    setForm({
      name: "",
      costTime: {
        quotient: { amount: 1, unit: "unitario18" },
        dividend: { amount: 1, unit: "minutos249" },
      },
      costMoney: {
        quotient: { amount: 1, unit: "reais11" },
        dividend: { amount: 1, unit: "unitario18" },
      },
    });
  };

  return (
    <PointerContainer
      onClose={resetForm}
      component={
        <Box
          id="new-process-form"
          data-testid="add-process-form"
          sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 320 }}
        >
          <TextField
            label="Nome"
            id="new-process-name"
            data-testid="add-process-name"
            onChange={(e) => setForm((curr) => ({ ...curr, name: e.target.value }))}
            size="small"
            autoFocus
            sx={{ width: "100%", flexGrow: 1 }}
          />
          <Box data-testid="add-process-cost-time">
            <Typography>Tempo necessário</Typography>
            <CompoundSelector
              filterDividends={(u, s) =>
                u.id === "unitario18" || s?.id === "temporal247"
              }
              filterQuotients={(u, s) =>
                u.id === "unitario18" || s?.id === "temporal247"
              }
              value={form.costTime}
              onChange={(v) =>
                setForm((curr) => ({
                  ...curr,
                  costTime: snapCostTime(curr.costTime, v),
                }))
              }
            />
          </Box>
          <Box data-testid="add-process-cost-money">
            <Typography>Dinheiro necessário (mão de obra)</Typography>
            <CompoundSelector
              filterQuotients={(_u, s) => s?.id === "monetaria10"}
              filterDividends={(u, s) =>
                u.id === "unitario18" || s?.id === "temporal247"
              }
              value={form.costMoney}
              onChange={(v) => setForm((curr) => ({ ...curr, costMoney: v }))}
            />
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-process-confirm"
          disabled={!form.name.trim()}
          handleConfirm={() => {
            if (!form.name.trim()) return;
            variation.actions.addProcess(form);
            resetForm();
          }}
        />,
      ]}
    >
      <Button
        id="composer-add-process"
        data-testid="add-process"
        aria-label="add-process"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ProcessList/addProcess`}
        >
          <Typography>Adicionar Processo</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
