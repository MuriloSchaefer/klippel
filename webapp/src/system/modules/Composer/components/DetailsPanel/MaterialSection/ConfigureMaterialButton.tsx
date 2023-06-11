import { Box, IconButton, Paper } from "@mui/material";
import TuneSharpIcon from "@mui/icons-material/TuneSharp";
import { ILayoutModule } from "@kernel/modules/Layout";
import useModule from "@kernel/hooks/useModule";

const ConfigureMaterialButton = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { SystemModal } = layoutModule.components;

  return (
    <>
      <SystemModal
        component={
          <Paper
            elevation={6}
            id="tune-modal"
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              bgcolor: "background.paper",
              p: 4,
            }}
          >
            <Box sx={{ width: "calc(100vw - 20%)" }}></Box>
          </Paper>
        }
      >
        <IconButton
          key="configure"
          id="configure-material"
          sx={{ flexGrow: 2 }}
        >
          <TuneSharpIcon />
        </IconButton>
      </SystemModal>
    </>
  );
};

export default ConfigureMaterialButton;
