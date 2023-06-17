import { Box, Button, Typography } from "@mui/material";
import {
  DataGrid,
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";
import AddSharpIcon from "@mui/icons-material/AddSharp";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  CompositionState,
  MaterialUsageNode,
} from "../../../../store/composition/state";
import { useMemo } from "react";

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
      {} as {[elem:string]: {[att: string]: boolean}}
    );
  }, [node]);

  const rows = Object.entries(adaptedProxies).map(([elem, proxy]) =>({...proxy, id: elem}))
  console.log(rows)
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
          <Button startIcon={<AddSharpIcon />}>Adicionar vínculo</Button>
        </Box>
      </Typography>
      <DataGrid
        editMode="row"
        density="compact"
        hideFooter={true}
        columns={[
          {
            field: "id",
            editable: true,
            flex: 1,
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
        ]}
        rows={rows}
      />
    </Box>
  );
};

export default LinkMaterialContainer;
