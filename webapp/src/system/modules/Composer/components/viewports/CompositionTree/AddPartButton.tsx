import { useCallback, useState } from "react";

import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import AddSharpIcon from "@mui/icons-material/AddSharp";

import { useTheme } from "@mui/material/styles";
import useVariation from "@system/modules/Composer/hooks/useVariation";

interface AddPartForm {
  name: string;
}

export const AddPartButton = ({
  variationId,
  parentId,
}: {
  variationId: string;
  parentId: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const variation = useVariation({ variationId });
  const theme = useTheme();

  const [form, setForm] = useState<AddPartForm>({
    name: "",
  });

  const handleSubmit = useCallback(() => {
    variation.actions.addPart(form.name, parentId);
  }, [form]);

  return (
    <PointerContainer
      component={
        <Box
          sx={{
            width: 200,
          }}
        >
          <TextField
            id="part-name"
            label="Nome"
            variant="standard"
            value={form.name}
            onChange={(v) => setForm({ name: v.target.value })}
          />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" handleConfirm={handleSubmit} />,
      ]}
    >
      <IconButton
        aria-label="Add new part"
        size="small"
        sx={{ lineHeight: "0.3em", color: theme.palette.success.dark }}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <AddSharpIcon />
      </IconButton>
    </PointerContainer>
  );
};

export default AddPartButton;
