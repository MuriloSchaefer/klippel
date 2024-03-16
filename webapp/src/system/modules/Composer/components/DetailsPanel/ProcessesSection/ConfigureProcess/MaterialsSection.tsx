import { useCallback, useContext, useEffect } from "react";
import _ from "lodash";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import {
  GridColDef,
  GridRenderEditCellParams,
  useGridApiContext,
} from "@mui/x-data-grid";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type Edge from "@kernel/modules/Graphs/interfaces/Edge";
import type {
  EdgesHashMap,
  NodesHashMap,
} from "@kernel/modules/Graphs/store/state";

// TODO: enforce to only allow import type from other systems modules
import type { IConverterModule } from "@system/modules/Converter";
import type { CompoundValue } from "@system/modules/Converter/typings";

import type { ConfigProcessProps } from "./Container";
import type {
  CompositionGraph,
  CompositionNode,
  ConsumesEdge,
} from "../../../../store/composition/state";
import CRUDMaterialUsageEditCell from "./CRUDMaterialUsageEditCell";

function RenderEditCellQuantity({
  row,
  id,
  field,
}: GridRenderEditCellParams<ConsumesEdge>) {
  const apiRef = useGridApiContext();

  const converterModule = useModule<IConverterModule>("Converter");

  const {
    components: { CompoundSelector },
  } = converterModule;

  const handleChange = useCallback(
    (v: CompoundValue) => {
      apiRef.current.setEditCellValue({ id, field, value: v });
    },
    [id]
  );

  return (
    <CompoundSelector
      id="quantity"
      filterQuotients={(unit, scale) =>
        scale?.name === "Comprimento" ||
        scale?.name === "Volume" ||
        scale?.name === "Area"
      }
      filterDividends={(unit, scale) => unit.abbreviation === "un"}
      value={row.quantity}
      onChange={handleChange}
    />
  );
}

export default ({ compositionState, processId }: ConfigProcessProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const converterModule = useModule<IConverterModule>("Converter");

  const { useGraph } = graphModule.hooks;
  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid } = layoutModule.components;
  const {
    components: { CompoundUnit },
  } = converterModule;

  const filterEdges = (edges: EdgesHashMap<Edge>) =>
    Object.values(edges).filter(
      (e) =>
        e.type === "MADE_OF" && e.sourceId === compositionState.selectedPart
    );
  const getMaterialUsageNodes = (
    nodes: NodesHashMap<CompositionNode>,
    filter: string[]
  ) =>
    Object.entries(nodes).reduce((acc, [id, node]) => {
      if (filter.includes(id)) return { ...acc, [id]: node };
      return acc;
    }, {});

  const { state } = useGraph<
    CompositionGraph,
    {
      edges: Edge[];
      nodes: NodesHashMap<CompositionNode>;
    }
  >(
    compositionState.graphId,
    (g) =>
      g && {
        edges: filterEdges(g.edges),
        nodes: getMaterialUsageNodes(
          g.nodes,
          filterEdges(g.edges).map((e) => e.targetId)
        ),
      }
  );

  const { state: usageEdges } = useGraph<CompositionGraph, ConsumesEdge[]>(
    compositionState.graphId,
    (g) =>
      g?.edges &&
      (Object.values(g.edges).filter(
        (edge) => edge.type === "CONSUMES" && edge.sourceId === processId
      ) as ConsumesEdge[])
  );

  const { setRows } = useContext(CRUDGridContext);

  useEffect(() => {
    if (usageEdges?.length) {
      setRows(usageEdges.map((ue) => ({ ...ue, state: "untouched" })));
    }
  }, usageEdges);

  if (!state) return <></>; // TODO: add loading

  const columns: GridColDef<ConsumesEdge>[] = [
    {
      field: "targetId",
      editable: true,
      flex: 2,
      minWidth: 200,
      renderCell: ({ row: { targetId }, value }) => (
        <>{state.nodes[targetId]?.label}</>
      ),
      renderEditCell: ({ value, ...props }) => (
        <CRUDMaterialUsageEditCell
          value={value ?? props.row.targetId}
          partId={compositionState.selectedPart!}
          graphId={compositionState.graphId}
          {...props}
        />
      ),
      renderHeader: () => "Material",
    },
    {
      field: "quantity",
      editable: true,
      flex: 2,
      width: 800,
      minWidth: 400,
      align: "center",
      headerAlign: "center",
      renderHeader: () => "Quantidade",
      renderCell: ({ row: { quantity } }) => <CompoundUnit value={quantity} />,
      renderEditCell: (props: GridRenderEditCellParams<ConsumesEdge>) => (
        <RenderEditCellQuantity {...props} />
      ),
    },
  ];

  return (
    <Box role="material-usage-management-container">
      <Typography variant="h4">Materiais consumidos</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra os materiais utilizados neste processo.</p>
        <p>
          Essas informações são utilizadas para calcular o custo em tempo e
          dinheiro da peça.
        </p>
      </Typography>
      <CRUDGrid
        addLabel="Víncular material"
        newRecord={() => {
          const id = _.uniqueId("material-usage-");
          return {
            id,
            type: "CONSUMES",
            sourceId: processId,
            targedId: "",
            quantity: {
              quotient: { amount: 1, unit: "cm2" },
              dividend: { amount: 1, unit: "un" },
            },
          };
        }}
        columns={columns as GridColDef[]} // QUESTION: how to remove type enforcement?
      />
    </Box>
  );
};
