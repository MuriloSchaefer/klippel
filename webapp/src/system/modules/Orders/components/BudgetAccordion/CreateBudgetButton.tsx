import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";

import useBudgetManager from "../../hooks/useBudgetManager";
import { CREATE_BUDGET_SHORTCUT_ID } from "../../constants";

type CreateBudgetForm = {
  label: string;
  color: string;
};

const DEFAULT_COLOR = "#1976d2";

export default function CreateBudgetButton() {
  const theme = useTheme();
  const pointerModule = useModule<IPointerModule>("Pointer");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ColorPicker } = layoutModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const [form, setForm] = useState<CreateBudgetForm>({
    label: "",
    color: DEFAULT_COLOR,
  });

  const manager = useBudgetManager();

  const resetForm = () => setForm({ label: "", color: DEFAULT_COLOR });

  const handleCreateBudget = useCallback(() => {
    if (!form.label.trim()) return;
    manager.createBudget(form.label.trim(), form.color || DEFAULT_COLOR);
    resetForm();
  }, [form.color, form.label, manager]);

  return (
    <PointerContainer
      onClose={resetForm}
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          id="create-budget-confirm"
          data-testid="create-budget-confirm"
          value={"Submit"}
          color="success"
          key="accept"
          disabled={!form.label.trim()}
          handleConfirm={handleCreateBudget}
        />,
      ]}
      component={
        <Box
          data-testid="create-budget-form"
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: 2,
            p: 1,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ColorPicker
            value={form.color}
            sx={{
              width: "40px",
              height: "40px",
              border: `1px solid ${theme.palette.getContrastText(
                theme.palette.background.default
              )}`,
            }}
            colorChange={(color: { hex: string }) =>
              setForm((curr) => ({ ...curr, color: color.hex }))
            }
          />
          <TextField
            id="budget-name"
            data-testid="budget-name"
            label="Nome"
            variant="standard"
            value={form.label}
            autoFocus
            sx={{ minWidth: "100px" }}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, label: v.target.value }))
            }
          />
        </Box>
      }
    >
      <Button
        id="create-budget"
        data-testid="create-budget"
        aria-label="create-budget"
        variant="outlined"
        color="info"
      >
        <ShortcutHint placement="top-center" shortcutId={CREATE_BUDGET_SHORTCUT_ID}>
          <Typography>Criar orçamento</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
