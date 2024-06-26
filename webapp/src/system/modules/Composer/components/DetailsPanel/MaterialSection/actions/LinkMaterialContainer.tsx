import React, { useContext, useEffect, useMemo, useState } from "react";
import _ from "lodash";

import Box from "@mui/material/Box";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { GridRenderEditCellParams } from "@mui/x-data-grid";
import InputAdornment from "@mui/material/InputAdornment";
import ColorizeSharpIcon from "@mui/icons-material/ColorizeSharp";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { PointerContainerProps } from "@kernel/modules/Pointer/components/PointerContainer";

import {
  CompositionState,
  MaterialUsageNode,
} from "../../../../store/composition/state";
import { useTheme } from "@mui/material/styles";

interface LinkMaterialContainerProps extends PointerContainerProps {
  compositionState: CompositionState;
  materialUsageId: string;
}

const LinkMaterialContainer = ({
  compositionState,
  materialUsageId,
}: LinkMaterialContainerProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const [pickingElement, setPickingElement] = useState(false)
  const theme = useTheme()

  const { useNodeInfo } = graphModule.hooks;

  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid, CRUDBooleanCell, CRUDTextFieldCell } =
    layoutModule.components;

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
          state: "untouched",
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
        addLabel="Adicionar vínculo"
        newRecord={() => ({
          id: _.uniqueId("proxy-"),
          stroke: false,
          fill: false,
        })}
        columns={[
          {
            field: "elem",
            editable: true,
            flex: 1,
            width: 100,
            minWidth: 200,
            maxWidth: 200,
            renderHeader: () => "Elemento",
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CRUDTextFieldCell
                {...params}
                InputProps={{
                  endAdornment: (
                    <InputAdornment
                      position="end"
                      sx={{ cursor: "pointer", color: pickingElement ? theme.palette.secondary.main : undefined }}
                      onClick={(evt) => {
                        console.log("clicked", evt);
                        setPickingElement(true)
                      }}
                    >
                      <ColorizeSharpIcon />
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
              />
            ),
          },
          {
            field: "stroke",
            editable: true,
            width: 100,
            flex: 1,
            minWidth: 100,
            maxWidth: 200,
            renderHeader: () => "Contorno",
            renderCell: ({ value }) => <Switch checked={value} disabled />,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CRUDBooleanCell {...params} />
            ),
          },
          {
            field: "fill",
            editable: true,
            width: 100,
            flex: 1,
            minWidth: 100,
            maxWidth: 200,
            renderHeader: () => "Preenchimento",
            renderCell: ({ value }) => <Switch checked={value} disabled />,
            renderEditCell: (params: GridRenderEditCellParams) => (
              <CRUDBooleanCell {...params} />
            ),
          },
        ]}
      />
    </Box>
  );
};

export default React.memo(LinkMaterialContainer);
