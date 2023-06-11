import { SystemModalProps } from "@kernel/modules/Layout/components/SystemModal";
import { Box, Paper } from "@mui/material";

interface ModelSelectionModal extends SystemModalProps {
  onModelSelection: (name: string, path: string) => void;
}

const ModelSelectionModal = ({
  closeModal,
  onModelSelection,
}: ModelSelectionModal) => {
  return (
    <Paper
      elevation={6}
      id="open-model-modal"
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        bgcolor: "background.paper",
        p: 4,
      }}
    >
      <Box
        onClick={() => {
          onModelSelection("Decorated", "camisa-polo/decorated.svg");
          closeModal?.();
        }}
        sx={{ cursor: "pointer" }}
      >
        Camisa polo fem
      </Box>
    </Paper>
  );
};

export default ModelSelectionModal;
