import { Box, Button, Typography, styled } from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
  useGridApiContext,
} from "@mui/x-data-grid";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  CompositionState,
  MaterialUsageNode,
} from "../../../../store/composition/state";
import { useCallback, useMemo, useState } from "react";

import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/DeleteOutlined';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Close';
import _ from "lodash";

const StyledDataGrid = styled(DataGrid)`
  .MuiDataGrid-overlayWrapper {
    height: "5em";
  }
`;

function CustomEditComponent(props: GridRenderEditCellParams) {
  const { id, value, field } = props;
  const apiRef = useGridApiContext();
  const handleValueChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value; // The new value entered by the user
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };
  return <input type="text" value={props.value} onChange={handleValueChange} />;
}

const LinkMaterialContainer = ({
  compositionState,
  materialUsageId,
}: {
  compositionState: CompositionState;
  materialUsageId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useNodeInfo } = graphModule.hooks;
  const { node } = useNodeInfo<MaterialUsageNode>(
    compositionState.graphId,
    materialUsageId
  );
  const adaptedProxies = useMemo(() => {
    return node.proxies.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.elem]: { ...acc[curr.elem], [curr.attr]: true },
      }),
      {} as { [elem: string]: { [att: string]: boolean } }
    );
  }, [node]);

  const initialRows: GridRowsProp = useMemo(
    () =>
      Object.entries(adaptedProxies).map(([elem, proxy]) => ({
        ...proxy,
        elem,
        id: _.uniqueId('proxy-'),
      })),
    [adaptedProxies]
  );


  const [rows, setRows] = useState(initialRows)
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});

  const handleAddLink = useCallback(() => {
    const id = _.uniqueId('proxy-');
    setRows((oldRows) => [...oldRows, { id, fill: false, stroke: false }]);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [id]: { mode: GridRowModes.Edit, fieldToFocus: 'id' },
    }));
  }, [])

  const handleEditClick = useCallback((id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  }, []);

  const handleSaveClick = useCallback((id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  }, []);

  const handleDeleteClick = useCallback((id: GridRowId) => () => {
    setRows(rows.filter((row) => row.id !== id));
  }, [])

  const handleCancelClick = useCallback((id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });

    const editedRow = rows.find((row) => row.id === id);
    if (editedRow!.isNew) {
      setRows(rows.filter((row) => row.id !== id));
    }
  }, []);


  return (
    <Box role="link-material-container" sx={{ height: "max-content" }}>
      <Typography variant="h4">Elementos visuais vinculados</Typography>
      <Typography>
        <p>
          A tabela abaixo mostra os atuais elementos visuais vínculados com o
          material.
        </p>
        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
          <p>Manipule a tabela para alterar os valores</p>
          <Button startIcon={<AddSharpIcon />} onClick={handleAddLink}>Adicionar vínculo</Button>
        </Box>
      </Typography>
      <StyledDataGrid
        editMode="row"
        density="compact"
        hideFooter={true}
        rowModesModel={rowModesModel}
        slots={{
          noRowsOverlay: () => (
            <Box sx={{ height: "2em" }}>Não há elementos vínculados</Box>
          ),
        }}
        columns={[
          {
            field: "id",
            editable: true,
            resizable: true,
            renderHeader: () => "Id.",
            // renderEditCell: (params: GridRenderEditCellParams) => (
            //   <CustomEditComponent {...params} />
            // ),
          },
          {
            field: "elem",
            editable: true,
            flex: 1,
            maxWidth:rows.length > 0 ? undefined : 100,
            resizable: true,
            renderHeader: () => "Elemento",
            // renderEditCell: (params: GridRenderEditCellParams) => (
            //   <CustomEditComponent {...params} />
            // ),
          },
          {
            field: "stroke",
            editable: true,
            renderHeader: () => "Contorno",
          },
          {
            field: "fill",
            editable: true,
            renderHeader: () => "Preenchimento",
          }, 
          {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            //width: 'min-content',
            flex: 0.5,
            maxWidth: 80,
            cellClassName: 'actions',
            getActions: ({ id }) => {
              const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
      
              if (isInEditMode) {
                return [
                  <GridActionsCellItem
                    icon={<SaveIcon />}
                    label="Save"
                    sx={{
                      color: 'primary.main',
                    }}
                    onClick={handleSaveClick(id)}
                  />,
                  <GridActionsCellItem
                    icon={<CancelIcon />}
                    label="Cancel"
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
                  className="textPrimary"
                  onClick={handleEditClick(id)}
                  color="inherit"
                />,
                <GridActionsCellItem
                  icon={<DeleteIcon />}
                  label="Delete"
                  onClick={handleDeleteClick(id)}
                  color="inherit"
                />,
              ];
            },
          }
        ]}
        rows={rows}
      />
    </Box>
  );
};

export default LinkMaterialContainer;
