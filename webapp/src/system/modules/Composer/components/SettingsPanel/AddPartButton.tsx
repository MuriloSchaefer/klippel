import { useCallback, useState } from "react";

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';

import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import AdjustSharpIcon from "@mui/icons-material/AdjustSharp";

import useComposition from "../../hooks/useComposition";

interface AddPartForm {
  name: string;
  domId: string;
}

export const AddPartButton = ({
  compositionName,
}: {
  compositionName: string;
}) => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const composition = useComposition({compositionName}, (c) => c?.selectedPart);

  const [form, setForm] = useState<AddPartForm>({
    name: "",
    domId: "",
  });

  const handleSubmit = useCallback(() => {
    composition.actions.addPart(form.name, form.domId, composition.state);
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
            onChange={(v) =>
              setForm((curr) => ({ ...curr, name: v.target.value }))
            }
          />
          <TextField
            id="dom-id-name"
            label="Dom ID"
            variant="standard"
            value={form.domId}
            onChange={(v) =>
              setForm((curr) => ({ ...curr, domId: v.target.value }))
            }
            sx={{ alignItems: "center" }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="pick dom id"
                    edge="end"
                    sx={{ paddingLeft: "0px" }}
                    disabled
                  >
                    <AdjustSharpIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>
      }
      actions={[<ConfirmAndCloseButton key="confirm" handleConfirm={handleSubmit}/>,]}
    >
      <IconButton
        aria-label="Add new part"
        size="small"
        sx={{ lineHeight: "0.3em" }}
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
