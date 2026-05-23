import { useState } from "react";
import { shallowEqual } from "react-redux";
import {
  Button,
  Box,
  FormControl,
  Typography,
  TextField,
  useTheme,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IMaterialsModule } from "@system/modules/Materials";
import { Store } from "@kernel/modules/Store";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../../constants";
import { useVariationActions } from "../../../hooks/useVariationActions";

export default function AddMaterialButton({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const theme = useTheme();
  const materialModule = useModule<IMaterialsModule>("Materials");
  const storeModule = useModule<Store>("Store");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { MaterialTypeMultiSelector, MaterialSelector, MaterialTypeSelector } =
    materialModule.components;
  const { useAppSelector } = storeModule.hooks;

  const { actions } = useVariationActions({ variationId });

  const nodeKeys = useAppSelector(
    (s: any): string[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      return nodes ? Object.keys(nodes) : [];
    },
    shallowEqual,
  );

  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [label, setLabel] = useState<string>(
    `material-${Math.random().toString(36).substring(2, 8)}`
  );
  const [typeRestrictions, setTypeRestrictions] = useState<string[]>([]);

  const normalizedLabel = label.toLowerCase().replaceAll(/\s+/g, "-");
  const labelExists = nodeKeys.includes(normalizedLabel);

  const resetForm = () => {
    setSelectedType("");
    setSelectedMaterial(null);
    setTypeRestrictions([]);
    setLabel(`material-${Math.random().toString(36).substring(2, 8)}`);
  };

  return (
    <PointerContainer
      onClose={resetForm}
      component={
        <Box data-testid="add-material-form" sx={{ minWidth: 320, padding: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
              <TextField
                required
                value={label}
                label="Label"
                data-testid="add-material-label"
                size="small"
                onChange={(e) => setLabel(e.target.value)}
                helperText={
                  <Box sx={{ lineHeight: 1 }}>
                    <Typography
                      sx={{
                        color: label
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                      }}
                    >
                      Deve existir um label
                    </Typography>
                    <Typography
                      sx={{
                        color: label && !labelExists
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                      }}
                    >
                      Deve ser único
                    </Typography>
                  </Box>
                }
              />
            </FormControl>
            <FormControl
              data-testid="add-material-type-restrictions"
              sx={{ m: 1 }}
              fullWidth
              size="small"
            >
              <MaterialTypeMultiSelector
                required
                label="Tipos permitidos"
                value={typeRestrictions}
                sx={{ minWidth: 200 }}
                onChange={(e) => {
                  setTypeRestrictions(e.target.value as string[]);
                }}
                labelId="type-label"
              />
            </FormControl>
          </Box>
          <Box>
            <FormControl
              data-testid="add-material-type"
              sx={{ m: 1, width: "100%" }}
              fullWidth
              size="small"
            >
              <MaterialTypeSelector
                required
                value={selectedType}
                filter={(mt) => typeRestrictions.includes(mt.name)}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  if (!(e.target.value in typeRestrictions))
                    setTypeRestrictions((curr) => [...curr, e.target.value]);
                }}
                labelId="type-label"
              />
            </FormControl>
            <FormControl
              data-testid="add-material-material"
              sx={{ m: 1, width: "100%" }}
              fullWidth
              size="small"
            >
              {selectedType ? (
                <MaterialSelector
                  type={selectedType}
                  value={selectedMaterial ?? undefined}
                  onChange={(id: number) => setSelectedMaterial(id)}
                />
              ) : (
                <>Selecione um tipo de material</>
              )}
            </FormControl>
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="add-material-confirm"
          disabled={!selectedType || !selectedMaterial || !label || labelExists}
          handleConfirm={() => {
            if (selectedType && selectedMaterial) {
              actions.addMaterial(
                selectedMaterial,
                label,
                typeRestrictions
              );
              const addedLabel = label;
              const start = Date.now();
              const tryFocus = () => {
                const row = document.querySelector(
                  `[data-testid="material-item"][data-material-label="${addedLabel}"]`
                ) as HTMLElement | null;
                if (row) {
                  row.focus();
                  return;
                }
                if (Date.now() - start < 1500) {
                  requestAnimationFrame(tryFocus);
                }
              };
              requestAnimationFrame(tryFocus);
              resetForm();
            }
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button
        id="composer-add-material"
        aria-label="add-material"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ModelViewport/addMaterial`}
        >
          <Typography>Adicionar Material</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
