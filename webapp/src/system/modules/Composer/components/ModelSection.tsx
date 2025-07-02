import { Box, Divider, Typography } from "@mui/material";
import CreateModelIconButton from "./CreateModelIconButton";
import OpenModelIconButton from "./OpenModelIconButton";

export default function ModelSection() {
  return (
    <Box sx={{ display: "flex", gap: 5, alignItems:'end' }}>
      <Box
        sx={{ display: "flex", flexFlow: "column", justifyContent: "center" }}
      >
        <Box
          sx={{
            alignContent: "center",
            display: "flex",
            flexWrap: "wrap",
            "&>*": {
              flexBasis:'50%'
            },
          }}
        >
          <CreateModelIconButton />
          <OpenModelIconButton />
        </Box>
        <Typography align="center">Modelos</Typography>
      </Box>
      <Divider orientation="vertical" flexItem />
      <Box>
        <Box>
          <CreateModelIconButton />
          <OpenModelIconButton />
        </Box>

        <Typography align="center">Variações</Typography>
      </Box>
    </Box>
  );
}
