import { useState } from "react";
import { Box, IconButton, useTheme } from "@mui/material";
import { CancelSharp, SaveSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";

export default function EditMaterial({
  type,
  typeRestrictions,
  materialId,
  onSave,
  onCancel,
}: Readonly<{
  type: string;
  typeRestrictions: string[];
  materialId: string;
  onSave: (materialId: string) => void;
  onCancel: () => void;
}>) {
  const theme = useTheme();
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const { MaterialSelector, MaterialTypeSelector } = materialsModule.components;

  const [form, setForm] = useState<{
    type: string;
    materialId: string | undefined;
  }>({ materialId, type });
  
  return (
    <Box
      data-testid="edit-material-form"
      sx={{ display: "flex", flexDirection: "row", flexGrow: 1 }}
    >
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Box data-testid="edit-material-type">
            <MaterialTypeSelector
              value={form.type}
              filter={(type) => {
                return typeRestrictions.includes(type.name);
              }}
              onChange={(e) =>
                setForm((curr) => ({
                  ...curr,
                  type: e.target.value,
                  materialId: undefined,
                }))
              }
            />
          </Box>
          <Box data-testid="edit-material-material">
            <MaterialSelector
              type={form.type}
              value={form.materialId}
              onChange={(newId) =>
                setForm((curr) => ({ ...curr, materialId: newId }))
              }
            />
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          data-testid="edit-material-save"
          aria-label="save-material"
          sx={{
            "&:hover": { color: theme.palette.success.main },
          }}
          onClick={() => {
            if (!form.materialId) {
              throw Error("must select a material");
            }
            onSave(form.materialId);
          }}
        >
          <SaveSharp />
        </IconButton>
        <IconButton
          data-testid="edit-material-cancel"
          aria-label="cancel-edit-material"
          onClick={onCancel}
          sx={{
            "&:hover": { color: theme.palette.error.main },
          }}
        >
          <CancelSharp />
        </IconButton>
      </Box>
    </Box>
  );
}
