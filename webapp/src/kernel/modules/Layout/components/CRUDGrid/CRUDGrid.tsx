import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import {
  DataGrid,
  DataGridProps,
  GridActionsCellItem,
  GridColDef,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowId,
  GridRowModelUpdate,
  GridRowModes,
  GridRowModesModel,
  GridToolbarContainer,
  GridToolbarDensitySelector,
  GridValidRowModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import { useCallback, useState, useContext } from "react";

import _ from "lodash";

import AddSharpIcon from "@mui/icons-material/AddSharp";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Close";
import RestoreSharpIcon from "@mui/icons-material/RestoreSharp";
import { darken, lighten, styled } from "@mui/material/styles";

import { CRUDGridContext, } from "./CRUDGridProvider";
import type { GridApiCommunity } from "@mui/x-data-grid/internals";

const getBackgroundColor = (color: string, mode: string) =>
  mode === "dark" ? darken(color, 0.7) : lighten(color, 0.7);

const getHoverBackgroundColor = (color: string, mode: string) =>
  mode === "dark" ? darken(color, 0.6) : lighten(color, 0.6);

const getSelectedBackgroundColor = (color: string, mode: string) =>
  mode === "dark" ? darken(color, 0.5) : lighten(color, 0.5);

const getSelectedHoverBackgroundColor = (color: string, mode: string) =>
  mode === "dark" ? darken(color, 0.4) : lighten(color, 0.4);

const StyledDataGrid = styled(DataGrid)(({ theme }) => ({
  "& .state--added": {
    backgroundColor: getBackgroundColor(
      theme.palette.success.main,
      theme.palette.mode
    ),
    "&:hover": {
      backgroundColor: getHoverBackgroundColor(
        theme.palette.success.main,
        theme.palette.mode
      ),
    },
    "&.Mui-selected": {
      backgroundColor: getSelectedBackgroundColor(
        theme.palette.success.main,
        theme.palette.mode
      ),
      "&:hover": {
        backgroundColor: getSelectedHoverBackgroundColor(
          theme.palette.success.main,
          theme.palette.mode
        ),
      },
    },
  },
  "& .state--modified": {
    backgroundColor: getBackgroundColor(
      theme.palette.warning.main,
      theme.palette.mode
    ),
    "&:hover": {
      backgroundColor: getHoverBackgroundColor(
        theme.palette.warning.main,
        theme.palette.mode
      ),
    },
    "&.Mui-selected": {
      backgroundColor: getSelectedBackgroundColor(
        theme.palette.warning.main,
        theme.palette.mode
      ),
      "&:hover": {
        backgroundColor: getSelectedHoverBackgroundColor(
          theme.palette.warning.main,
          theme.palette.mode
        ),
      },
    },
  },
  "& .state--deleted": {
    backgroundColor: getBackgroundColor(
      theme.palette.error.main,
      theme.palette.mode
    ),
    "&:hover": {
      backgroundColor: getHoverBackgroundColor(
        theme.palette.error.main,
        theme.palette.mode
      ),
    },
    "&.Mui-selected": {
      backgroundColor: getSelectedBackgroundColor(
        theme.palette.error.main,
        theme.palette.mode
      ),
      "&:hover": {
        backgroundColor: getSelectedHoverBackgroundColor(
          theme.palette.error.main,
          theme.palette.mode
        ),
      },
    },
  },
  // "& .MuiDataGrid-virtualScroller": {
  //   width: '100%'
  // },
  // "& .MuiDataGrid-cell--editing": {
  //   width: '100%',
  //   maxWidth: '100vh'
  // }
}));
const NoRows = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
      width: "100%",
    }}
  >
    <Typography variant="body2">Sem registros</Typography>
  </Box>
);

const CustomToolbar = ({
  handleAddRecord,
  addLabel,
}: {
  handleAddRecord: () => void;
  addLabel: string;
}) => {
  return (
    <GridToolbarContainer
      sx={{ display: "flex", justifyContent: "space-around" }}
    >
      <Button startIcon={<AddSharpIcon />} onPointerUp={handleAddRecord}>
        {addLabel || "Adicionar"}
      </Button>
      <div>
        <GridToolbarDensitySelector />
      </div>
    </GridToolbarContainer>
  );
};

type CRUDGridRow = GridValidRowModel & {
  state: "untouched" | "modified" | "added" | "deleted";
};

export const CRUDGrid = ({
  columns,
  addLabel,
  newRecord,
  onRecordAdded,
  onSave,
  onCancel,
  slots,
  ...props
}: Omit<DataGridProps, "rows"> & {
  columns: GridColDef<GridValidRowModel>[];
  newRecord: () => GridValidRowModel & { id: string };
  onRecordAdded?: (record: GridValidRowModel, api: GridApiCommunity)=>void;
  addLabel?: string;
  onSave?:()=>void
  onCancel?:()=>void
}) => {
  const { rows, setRows } = useContext(CRUDGridContext);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const api = useGridApiRef()

  const handleAddRecord = () => {
    const rec = newRecord();
    setRows((oldRows) => [
      ...oldRows,
      { ...rec, state: "added", ref: null },
      // { id, fill: false, stroke: false, state: "added" },
    ]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [rec.id]: { mode: GridRowModes.Edit, fieldToFocus: "id" },
    }));
    onRecordAdded?.(rec, api.current)
  };

  const handleEditClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((currModes) => {
        return {
          ...currModes,
          [id]: { mode: GridRowModes.Edit },
        };
      });
    },
    []
  );

  const processRowUpdate = (newRow: GridRowModelUpdate) => {
    setRows((rows) =>
      rows.map((row) =>
        row.id === newRow.id ? { ...newRow, old: { ...row, old: null } } : row
      )
    );
    return newRow;
  };

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (
    params,
    event
  ) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleSaveClick = useCallback(
    (id: GridRowId) => {
      const record = rows.find((r) => r.id === id);
      if (!record) return;
      const newState = record.state === "untouched" ? "modified" : record.state;
      setRows((oldRows) =>
        oldRows.map((r) => (r.id === id ? { ...r, state: newState } : r))
      );
      setRowModesModel((currModes) => ({
        ...currModes,
        [id]: { mode: GridRowModes.View },
      }));
      onSave?.()
    },
    [rows]
  );

  const handleDeleteClick = useCallback(
    (id: GridRowId) => () => {
      setRows(
        (rows) =>
          rows
            .map((r) =>
              r.id === id ? { ...r, state: "deleted", oldState: r.state } : r
            )
            .filter((r) => !(r.state === "deleted" && r?.oldState === "added")) // remove row if it was a new entry
      );
    },
    []
  );
  const handleRestoreClick = useCallback(
    (id: GridRowId) => () => {
      setRows((rows) =>
        rows.map((r) =>
          r.id === id ? { ...r, state: r.oldState, oldState: "deleted" } : r
        )
      );
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
      if (editedRow && editedRow.state === "added") {
        setRows((rows) => rows.filter((row) => row.id !== id));
      }
      onCancel?.()
    },
    [rows]
  );

  return (
    <StyledDataGrid
      editMode="row"
      apiRef={api}
      hideFooter={true}
      autoHeight={true}
      rowModesModel={rowModesModel}
      getRowClassName={(params) => `state--${params.row.state}`}
      onRowEditStop={handleRowEditStop}
      processRowUpdate={processRowUpdate}
      slotProps={{ toolbar: { handleAddRecord, addLabel } }}
      slots={{
        noRowsOverlay: NoRows,
        toolbar: CustomToolbar,
        ...slots,
      }}
      columns={[
        ...columns,
        {
          field: "actions",
          type: "actions",
          headerName: "Actions",
          cellClassName: "actions",
          getActions: ({ id }) => {
            const row = rows.find((row) => row.id === id);
            if (!row) return [];
            const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;

            if (isInEditMode) {
              return [
                <GridActionsCellItem
                  icon={<SaveIcon />}
                  label="Save"
                  key="save"
                  id={`save-${id}`}
                  sx={{
                    color: "primary.main",
                  }}
                  onClick={() => handleSaveClick(id)}
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

            if (row.state === "deleted")
              return [
                <GridActionsCellItem
                  icon={<RestoreSharpIcon />}
                  label="Restore"
                  key="restore"
                  className="textPrimary"
                  onClick={handleRestoreClick(id)}
                  color="inherit"
                />,
              ];

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
      {...props}
      rows={rows}
    />
  );
};

export default CRUDGrid;
