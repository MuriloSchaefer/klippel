import React, { useState } from "react";
// Removed duplicate import of useModule
import type { IGraphModule } from "@kernel/modules/Graphs";
import {
  Button,
  Typography,
  Box,
  SelectChangeEvent,
  FormControl,
  InputLabel,
} from "@mui/material";
// Use MaterialTypeSelector from module system for correct typing
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IMaterialsModule } from "@system/modules/Materials";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import useVariation from '../../../hooks/useVariation';

export default function AddMaterialButton({
  variationId,
  onSelect,
}: {
  variationId: string;
  onSelect: (materialId: string) => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const materialModule: IMaterialsModule =
    useModule<IMaterialsModule>("Materials");
  const graphModule = useModule<any>("Graph");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { MaterialTypeSelector, MaterialSelector } = materialModule.components;
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);

  const variation = useVariation({variationId});
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedMaterial, setSelectedMaterial] = useState<number | null>(null);

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 320, padding: 2 }}>
          <FormControl
            sx={{ m: 1,  width: "100%" }}
            fullWidth
            size="small"
          >
            <MaterialTypeSelector
              required
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            />
          </FormControl>

          <FormControl
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
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          disabled={!selectedType || !selectedMaterial}
          handleConfirm={() => {
            if (selectedType && selectedMaterial) {
              // Persist to graph
              variation.actions.addMaterial(selectedMaterial)
              setOpen(false);
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
