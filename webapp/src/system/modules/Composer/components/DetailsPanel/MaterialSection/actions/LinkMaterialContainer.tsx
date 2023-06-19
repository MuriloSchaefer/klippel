import { Box, Button, Typography, styled } from "@mui/material";
import {
  GridRenderEditCellParams,
  GridRowsProp,
  useGridApiContext,
} from "@mui/x-data-grid";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  CompositionState,
  MaterialUsageNode,
} from "../../../../store/composition/state";
import { useMemo } from "react";

import _ from "lodash";
import { ILayoutModule } from "@kernel/modules/Layout";



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

  const initialRows: GridRowsProp = useMemo(
    () =>
      Object.entries(adaptedProxies).map(([elem, proxy]) => ({
        ...proxy,
        elem,
        id: _.uniqueId("proxy-"),
      })),
    [adaptedProxies]
  );

  return (
    <Box role="link-material-container" sx={{ height: "max-content" }}>
      <Typography variant="h4">Elementos visuais vinculados</Typography>
      <Typography>
        <p>
          A tabela abaixo mostra os atuais elementos visuais vínculados com o
          material.
        </p>
        <p>Manipule a tabela para alterar os valores</p>
      </Typography>
      <CRUDGrid
        initialRows={initialRows}
        columns={[
          {
            field: "elem",
            editable: true,
            flex: 4,
            minWidth: 100,
            resizable: true,
            renderHeader: () => "Elemento",
            // renderEditCell: (params: GridRenderEditCellParams) => (
            //   <CustomEditComponent {...params} />
            // ),
          },
          {
            field: "stroke",
            editable: true,
            flex: 1,
            minWidth: 100,
            renderHeader: () => "Contorno",
          },
          {
            field: "fill",
            editable: true,
            flex: 1,
            minWidth: 100,
            renderHeader: () => "Preenchimento",
          },
        ]}
      />
    </Box>
  );
};

export default LinkMaterialContainer;
