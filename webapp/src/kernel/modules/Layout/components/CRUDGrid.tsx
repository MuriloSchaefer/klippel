import { Box, Button, Typography, styled } from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowId,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  GridToolbarContainer,
  GridValidRowModel,
} from "@mui/x-data-grid";
import { useCallback, useState } from "react";

import _ from "lodash";

import AddSharpIcon from "@mui/icons-material/AddSharp";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";

const StyledDataGrid = styled(DataGrid)`
  .MuiDataGrid-overlayWrapper {
    height: 2em;
  }
`;
const NoRows = () => (
    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height:'100%', width:'100%'}}>
        <Typography variant="body2">Sem registros</Typography>
    </Box>
);

export const CRUDGrid = ({ initialRows, columns }: { initialRows: GridRowsProp, columns: GridColDef<GridValidRowModel>[] }) => {
  const [rows, setRows] = useState(initialRows);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const handleAddLink = useCallback(() => {
    const id = _.uniqueId("proxy-");
    setRows((oldRows) => [...oldRows, { id, fill: false, stroke: false }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: "id" },
    }));
  }, []);

  const handleEditClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((currModes) => ({
        ...currModes,
        [id]: { mode: GridRowModes.Edit },
      }));
    },
    []
  );

  const handleSaveClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((currModes) => ({
        ...currModes,
        [id]: { mode: GridRowModes.View },
      }));
    },
    []
  );

  const handleDeleteClick = useCallback(
    (id: GridRowId) => () => {
      console.log(id);
      console.log(rows);
      setRows((rows) => rows.filter((row) => row.id !== id));
    },
    []
  );

  const handleCancelClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((currModes) => ({
        ...currModes,
        [id]: { mode: GridRowModes.View, ignoreModifications: true },
      }));

      const editedRow = rows.find((row) => row.id === id);
      if (editedRow!.isNew) {
        setRows((rows) => rows.filter((row) => row.id !== id));
      }
    },
    []
  );

  return (
    <StyledDataGrid
      editMode="row"
      density="compact"
      hideFooter={true}
      rowModesModel={rowModesModel}
      slots={{
        noRowsOverlay: NoRows,
        toolbar: () => (
          <GridToolbarContainer >
            <Button startIcon={<AddSharpIcon />} onClick={handleAddLink}>
              Adicionar vínculo
            </Button>
          </GridToolbarContainer>
        ),
      }}
      columns={[
        ...columns,
        {
          field: "actions",
          type: "actions",
          headerName: "Actions",
          //width: 'min-content',
          flex: 2,
          minWidth: 80,
          cellClassName: "actions",
          getActions: ({ id }) => {
            const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

            if (isInEditMode) {
              return [
                <GridActionsCellItem
                  icon={<SaveIcon />}
                  label="Save"
                  key="save"
                  sx={{
                    color: "primary.main",
                  }}
                  onClick={handleSaveClick(id)}
                />,
                <GridActionsCellItem
                  icon={<CancelIcon />}
                  label="Cancel"
                  key="cancel"
                  className="textPrimary"
                  onClick={handleCancelClick(id)}
                  color="inherit"
                />,
              ];
            }

            return [
              <GridActionsCellItem
                icon={<EditIcon />}
                label="Edit"
                key="edit"
                className="textPrimary"
                onClick={handleEditClick(id)}
                color="inherit"
              />,
              <GridActionsCellItem
                icon={<DeleteIcon />}
                label="Delete"
                key="delete"
                onClick={handleDeleteClick(id)}
                color="inherit"
              />,
            ];
          },
        },
      ]}
      rows={rows}
    />
  );
};

export default CRUDGrid;
