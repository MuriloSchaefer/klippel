import { useCallback, useEffect, useState, forwardRef } from "react";

import IconButton from "@mui/material/IconButton";
import NoteAddSharpIcon from "@mui/icons-material/NoteAddSharp";

import useModule from "@kernel/hooks/useModule";

import type { IPointerModule } from "@kernel/modules/Pointer";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import { randomString } from "@kernel/utils";
import { Typography, useTheme } from "@mui/material";
import useModelsManager from "../../hooks/useModelsManager";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../constants";

export const CreateModelIconButton = forwardRef<HTMLButtonElement>(
  (props, ref) => {
    const modelsManager = useModelsManager();
    const theme = useTheme();
    const pointerModule = useModule<IPointerModule>("Pointer");
    const keyboardShortcutsModule =
      useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

    const { PointerContainer, ConfirmAndCloseButton } =
      pointerModule.components;
    const { ShortcutHint } = keyboardShortcutsModule.components;

    const [hashId, setHashId] = useState<string | undefined>(randomString(10));
    const [name, setName] = useState<string | undefined>(undefined);

    const handleModelCreation = useCallback(() => {
      if (!name || !hashId) return;
      modelsManager.createModel({ name: name, id: hashId });
    }, [name, hashId]);

    useEffect(() => () => setHashId(randomString(10)), []);

    return (
      <PointerContainer
        skipRefocus
        component={
          <Box
            component={"form"}
            id="new-model-form"
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1,
              padding: 2,
              minWidth: "300px",
            }}
          >
            <Typography sx={{ padding: 1, width: "100%", textAlign: "center" }}>
              Novo Modelo
            </Typography>
            <FormControl>
              <TextField
                error={!hashId || hashId.length > 30}
                id="hashId"
                label="ID"
                variant="standard"
                sx={{ marginBottom: 1 }}
                onChange={(evt) => setHashId((old) => evt.target.value)}
                value={hashId}
                helperText={
                  <Box sx={{ lineHeight: 1 }}>
                    <Typography
                      sx={{
                        color: hashId
                          ? theme.palette.success.main
                          : theme.palette.error.main,
                      }}
                    >
                      Deve existir um id
                    </Typography>
                    <Typography
                      sx={{
                        color:
                          hashId && hashId.length <= 30
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                      }}
                    >
                      Deve ter no máximo 30 caracteres
                    </Typography>
                  </Box>
                }
              />
              <TextField
                error={!name}
                id="name"
                label="Nome"
                variant="standard"
                sx={{ marginBottom: 1 }}
                onChange={(evt) => setName((old) => evt.target.value)}
                value={name}
                helperText="Escolha um nome para o modelo"
              />
            </FormControl>
          </Box>
        }
        actions={[
          <ConfirmAndCloseButton
            type="submit"
            id="new-model-form-accept"
            value={"Submit"}
            color="success"
            key="accept"
            handleConfirm={handleModelCreation}
            disabled={!name || !hashId || hashId.length > 30}
          />,
        ]}
      >
        <IconButton ref={ref} aria-label="create-model" id="new-model-form">
          <ShortcutHint placement="top-center" shortcutId={`${MODULE_NAME}/ModelSection/createModel`}>
            <NoteAddSharpIcon />
          </ShortcutHint>
        </IconButton>
      </PointerContainer>
    );
  },
);

export default CreateModelIconButton;
