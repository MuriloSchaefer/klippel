import {
  Box,
  FormControl,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { useCallback, useState } from "react";
import { useAppDispatch } from "../hooks";
import { createWorkspace } from "../actions";

export function NewWorkspaceButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const [name, setName] = useState<string | undefined>(undefined);

  const dispatch = useAppDispatch()

  const handleCreation = useCallback(() => {
    if (!name) return;
    dispatch(createWorkspace({name: name}))
  }, [name]);

  return (
    <PointerContainer
      component={
        <Box
          component={"form"}
          id="new-model-form"
          sx={{ display: "flex", flexDirection: "column", gap: 1, padding: 2, minWidth: '250px' }}
        >
          <Typography sx={{ padding: 1, width: "100%", textAlign: "center" }}>
            Novo Ambiente de trabalho
          </Typography>
          <FormControl>
            <TextField
              error={!name}
              id="name"
              label="Nome"
              variant="standard"
              sx={{ marginBottom: 1 }}
              onChange={(evt) => setName((old) => evt.target.value)}
              value={name}
              helperText={
                <Box sx={{ lineHeight: 1 }}>
                  <Typography sx={{ color: name ? "green" : "red" }}>
                    Escolha um nome para o ambiente
                  </Typography>
                </Box>
              }
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          type="submit"
          id="new-model-form"
          value={"Submit"}
          color="success"
          key="accept"
          handleConfirm={handleCreation}
          disabled={!name}
        />,
      ]}
    >
      <IconButton>
        <CreateNewFolderIcon />
      </IconButton>
    </PointerContainer>
  );
}
