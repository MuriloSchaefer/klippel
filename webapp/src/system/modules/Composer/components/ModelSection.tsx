import { Box, Divider, Typography } from "@mui/material";
import CreateModelIconButton from "./CreateModelIconButton";
import OpenModelIconButton from "./OpenModelIconButton";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../constants";

export default function ModelSection() {
  const shortcutModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider } = shortcutModule.components;

  return (
    <Box sx={{ display: "flex", gap: 5, alignItems: "end" }}>
      <ShortcutProvider contextId={`${MODULE_NAME}/ModelSection`}>
        <Box
          sx={{ display: "flex", flexFlow: "column", justifyContent: "center" }}
        >
          <Box
            sx={{
              alignContent: "center",
              display: "flex",
              flexWrap: "wrap",
              "&>*": {
                flexBasis: "50%",
              },
            }}
          >
            <CreateModelIconButton />
            <OpenModelIconButton />
          </Box>
          <Typography align="center">Modelos</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        {/* <Box>
          <Box>
            <CreateModelIconButton />
            <OpenModelIconButton />
          </Box>

          <Typography align="center">Variações</Typography>
        </Box> */}
      </ShortcutProvider>
    </Box>
  );
}
