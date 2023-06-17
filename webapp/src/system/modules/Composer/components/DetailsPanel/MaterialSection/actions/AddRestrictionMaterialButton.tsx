import {
  Box,
  IconButton,
  IconButtonProps,
  InputAdornment,
  TextField,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import useModule from "@kernel/hooks/useModule";

import AdjustSharpIcon from "@mui/icons-material/AdjustSharp";
import { IPointerModule } from "@kernel/modules/Pointer";
import EnhancedEncryptionSharpIcon from '@mui/icons-material/EnhancedEncryptionSharp';


const AddRestrictionMaterialButton = ({sx, ...props}: IconButtonProps) => {
  const pointerModule = useModule<IPointerModule>("Pointer");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  return (
    <>
      <PointerContainer
        component={
          <Box role="restrict-material-usage-container" sx={{height: 'max-content'}}>
            <DataGrid
              editMode="row"
              columns={[
                { field: "id", editable: true },
                { field: "stroke", editable: true },
                { field: "fill", editable: true },
              ]}
              rows={[
                {id: 'manga-esquerda', stroke: false, fill: true},
                {id: 'manga-direita', stroke: false, fill: true},
                {id: 'frente', stroke: false, fill: true},
                {id: 'costa', stroke: false, fill: true},
              ]}
            />

            <TextField
              id="dom-id-name"
              label="Dom ID"
              variant="standard"
              sx={{ alignItems: "center" }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="set proxies button"
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
        actions={[
          <ConfirmAndCloseButton
            color="success"
            key="accept"
            handleConfirm={() => null}
          />,
        ]}
      >
        <IconButton
          key="trigger-button"
          id="restrict-material-usage"
          sx={{ ...sx, flexGrow: 2 }}
          {...props}
        >
          <EnhancedEncryptionSharpIcon />
        </IconButton>
      </PointerContainer>
    </>
  );
};

export default AddRestrictionMaterialButton;
