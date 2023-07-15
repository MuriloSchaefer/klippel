import { Box, Switch, Typography } from "@mui/material";
import {
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  CompositionState,
  MaterialUsageNode,
} from "../../../../store/composition/state";
import { useContext, useEffect, useMemo } from "react";

import _ from "lodash";
import { ILayoutModule } from "@kernel/modules/Layout";

function CRUDBooleanCell({id, value, field}: GridRenderEditCellParams) {
  const apiRef = useGridApiContext();
  const handleValueChange = (event: React.ChangeEvent<any>) => {
    const newValue = event.target.checked; // The new value entered by the user
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };
  return <Switch checked={value} onChange={handleValueChange} />;
}

const LinkMaterialContainer = ({
  compositionState,
  materialUsageId,
}: {
  compositionState: CompositionState;
  materialUsageId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useNodeInfo } = graphModule.hooks;

  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid } = layoutModule.components;

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

  const { setRows } = useContext(CRUDGridContext);

  useEffect(
    () =>
      setRows(
        Object.entries(adaptedProxies).map(([elem, proxy]) => ({
          ...proxy,
          elem,
          state: 'untouched',
          id: _.uniqueId("proxy-"),
        }))
      ),
    [adaptedProxies]
  );

  return (
    <Box role="link-material-container" sx={{ height: "max-content" }}>
      <Typography variant="h4">Elementos visuais vinculados</Typography>
      <Typography component="div">
        <p>
          A tabela abaixo mostra os atuais elementos visuais vínculados com o
          material.
        </p>
        <p>Manipule a tabela para alterar os valores</p>
      </Typography>
      <CRUDGrid
        columns={[
          {
            field: "elem",
            editable: true,
            flex: 4,
            minWidth: 100,
            maxWidth: 200,
            // resizable: true,
            renderHeader: () => "Elemento",
            // renderEditCell: (params: GridRenderEditCellParams) => (
            //   <CustomEditComponent {...params} />
            // ),
          },
          {
            field: "stroke",
            editable: true,
            flex: 1,
            maxWidth: 200,
            minWidth: 100,
            renderHeader: () => "Contorno",
            renderCell: ({value})=> <Switch checked={value} disabled/>,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CRUDBooleanCell {...params} />
            ),
          },
          {
            field: "fill",
            editable: true,
            flex: 1,
            maxWidth: 200,
            minWidth: 100,
            renderHeader: () => "Preenchimento",
            renderCell: ({value})=> <Switch checked={value} disabled/>,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CRUDBooleanCell {...params} />
            ),
          },
        ]}
      />
    </Box>
  );
};

export default LinkMaterialContainer;
