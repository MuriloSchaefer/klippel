import { useState } from "react";
import {
  Button,
  Box,
  FormControl,
} from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IMaterialsModule } from "@system/modules/Materials";
import useVariation from '../../../hooks/useVariation';

export default function AddMaterialButton({
  variationId,
  onSelect,
}: Readonly<{
  variationId: string;
  onSelect: (materialId: string) => void;
}>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const materialModule: IMaterialsModule =
    useModule<IMaterialsModule>("Materials");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { MaterialTypeSelector, MaterialSelector } = materialModule.components;

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
