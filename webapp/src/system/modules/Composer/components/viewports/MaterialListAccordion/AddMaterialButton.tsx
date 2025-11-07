import { useState } from "react";
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
import useVariation from "../../../hooks/useVariation";
import { IGraphModule } from "@kernel/modules/Graphs";

export default function AddMaterialButton({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const theme = useTheme();
  const materialModule = useModule<IMaterialsModule>("Materials");
  const graphModule = useModule<IGraphModule>("Graph");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { MaterialTypeMultiSelector, MaterialSelector, MaterialTypeSelector } =
    materialModule.components;

  const variation = useVariation({ variationId });
  const graph = graphModule.hooks.useGraph(variationId, (g) => g);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);
  const [label, setLabel] = useState<string>(
    `material-${Math.random().toString(36).substring(2, 8)}`
  );
  const [typeRestrictions, setTypeRestrictions] = useState<string[]>([]);

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 320, padding: 2 }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
              <TextField
                required
                value={label}
                label="Label"
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
                        color:
                          label &&
                          !Object.keys(graph.state!.nodes).includes(
                            label.toLowerCase().replaceAll(/\s+/g, "-")
                          )
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
            <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
              <MaterialTypeMultiSelector
                required
                label="Tipos permitidos"
                value={typeRestrictions}
                sx={{ minWidth: 160 }}
                onChange={(e) => {
                  setTypeRestrictions(e.target.value as string[]);
                }}
                labelId="type-label"
              />
            </FormControl>
          </Box>
          <Box>
            <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
              <MaterialTypeSelector
                required
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  if (!(e.target.value in typeRestrictions))
                    setTypeRestrictions((curr) => [...curr, e.target.value]);
                }}
                labelId="type-label"
              />
            </FormControl>
            <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
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
          disabled={
            !selectedType ||
            !selectedMaterial ||
            !label ||
            Object.keys(graph.state!.nodes).includes(
              label.toLowerCase().replaceAll(/\s+/g, "-")
            )
          }
          handleConfirm={() => {
            if (selectedType && selectedMaterial) {
              // Persist to graph
              variation.actions.addMaterial(
                selectedMaterial,
                label,
                typeRestrictions
              );
            }
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button variant="outlined" color="primary">
        Adicionar Material
      </Button>
    </PointerContainer>
  );
}
