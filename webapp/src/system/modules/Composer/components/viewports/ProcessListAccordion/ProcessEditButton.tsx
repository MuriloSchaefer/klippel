import { Box, IconButton, TextField, Typography } from "@mui/material";
import { EditSharp } from "@mui/icons-material";
import { useState } from "react";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { IConverterModule } from "@system/modules/Converter";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { CompoundValue } from "@system/modules/Converter/typings";
import { ProcessNode } from "../../../typings";
import useVariation from "../../../hooks/useVariation";
import { MODULE_NAME } from "../../../constants";
import { snapCostTime } from "../../../utils/snapCostTime";

export default function ProcessEditButton({
  variationId,
  processNode,
  isFocused,
  onClose,
}: {
  variationId: string;
  processNode: ProcessNode;
  isFocused?: boolean;
  onClose?: () => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const converterModule = useModule<IConverterModule>("Converter");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { CompoundSelector } = converterModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const variation = useVariation({ variationId });

  const defaultCompound: CompoundValue = {
    quotient: { amount: 1, unit: "unitario18" },
    dividend: { amount: 1, unit: "minutos249" },
  };
  const defaultMoney: CompoundValue = {
    quotient: { amount: 1, unit: "reais11" },
    dividend: { amount: 1, unit: "unitario18" },
  };
  const [form, setForm] = useState({
    name: processNode.label,
    costTime: processNode.costTime ?? defaultCompound,
    costMoney: processNode.costMoney ?? defaultMoney,
  });
  return (
    <PointerContainer
      onClose={() => onClose?.()}
      component={
        <Box
          data-testid="edit-process-form"
          sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 320 }}
        >
          <TextField
            label="Nome"
            data-testid="edit-process-name"
            value={form.name}
            onChange={(e) =>
              setForm((curr) => ({ ...curr, name: e.target.value }))
            }
            size="small"
            autoFocus
            sx={{ width: "100%", flexGrow: 1 }}
          />
          <Box data-testid="edit-process-cost-time">
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
          <Box data-testid="edit-process-cost-money">
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
          data-testid="edit-process-confirm"
          disabled={!form.name.trim()}
          handleConfirm={() => {
            if (!processNode.id) return;
            if (!form.name.trim()) return;
            variation.actions.updateProcess(processNode.id, {
              label: form.name.trim(),
              costTime: form.costTime,
              costMoney: form.costMoney,
            });
          }}
        />,
      ]}
    >
      <IconButton
        data-testid="process-item-edit"
        aria-label="edit-process"
        sx={{ "&:hover": { color: "primary.main" } }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={`${MODULE_NAME}/ProcessItem/editProcess`}
          alwaysShow={isFocused}
        >
          <EditSharp color="info" />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}
