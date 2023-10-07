import  { useContext, useEffect, useMemo } from "react";
import _ from "lodash";


import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import {
  GridColDef,
  GridRenderEditCellParams,

} from "@mui/x-data-grid";


import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";

// QUESTION: how to share intefaces without direct import?
import type { IMaterialsModule } from "@system/modules/Materials";

import {
  CompositionEdge,
  MaterialUsageNode,
  RestrictionNode,
} from "../../../../../store/composition/state";
import { RestrictionsProps } from "./Container";

interface CellTypeFactoryProps {
  node: RestrictionNode;
}

function RenderCellTypeFactory({ node }: CellTypeFactoryProps) {
  switch (node.restrictionType) {
    case "allowOnly":
      return <>{node.operand.join(",")}</>;
    case "sameAs":
      return <>{node.operand}</>;
    default:
      return <></>;
  }
}
function RenderEditCellTypeFactory({
  row: node,
  ...rest
}: GridRenderEditCellParams<RestrictionNode>) {
  const {
    components: { CRUDMaterialTypeCell },
  } = useModule<IMaterialsModule>("Materials");

  switch (node.attribute) {
    case "materialType":
      return (
        <CRUDMaterialTypeCell
          row={node}
          value={node.operand}
          {...rest}
          multiple={node.restrictionType === "allowOnly"}
        />
      );
    default:
      return <></>;
  }
}

export default ({ compositionState, materialUsageId }: RestrictionsProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useGraph, useSearch } = graphModule.hooks;
  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid } = layoutModule.components;

  const {
    state: node,
    actions: { search },
  } = useGraph<MaterialUsageNode, CompositionEdge>(
    compositionState.graphId,
    (g) => g?.nodes[materialUsageId]
  );

  const searchId = useMemo(()=> `${materialUsageId}/restrictions`, [materialUsageId])

  const restrictions = useSearch(compositionState.graphId, searchId, ()=>{
    if (!node) return
    search(
      "bfs",
      node.id,
      (n, g) => {
        if (n.type !== "RESTRICTION") return false;
        const neighbours = g.adjacencyList[n.id];
        const result = neighbours.inputs.some((neighbour) => {
          const edge = g.edges[neighbour] as CompositionEdge;

          return edge.type === "RESTRICTED_BY"
        });
        return result;
      },
      () => false, // stops only when checked all neighbours
      1, // search only neighbours
      `Get all restriction associated with ${
        "label" in node ? node.label : node.id
      }`,
      searchId
    );
  })

  const { setRows } = useContext(CRUDGridContext);

  useEffect(() => {
    if (restrictions?.findings) setRows(restrictions.findings.map(r => ({...r, state: 'untouched'})));
  }, [restrictions]);
  useEffect(() => {
    if (restrictions?.findings) setRows(restrictions.findings);
  }, []);

  const columns: GridColDef<RestrictionNode>[] = [
    {
      field: "label",
      editable: true,
      flex: 1,
      width: 100,
      minWidth: 200,
      maxWidth: 400,
      renderHeader: () => "Restrição",
    },
    {
      field: "attribute",
      editable: true,
      flex: 1,
      width: 100,
      minWidth: 200,
      maxWidth: 400,
      renderHeader: () => "Atributo",
      renderCell: ({ value }) => <>{value}</>
    },
    {
      field: "restrictionType",
      editable: true,
      flex: 1,
      width: 100,
      minWidth: 200,
      maxWidth: 400,
      renderHeader: () => "Operador"
    },
    {
      field: "operand",
      editable: true,
      flex: 1,
      width: 100,
      minWidth: 200,
      maxWidth: 400,
      renderHeader: () => "Operando",
      renderCell: ({ row }) => <RenderCellTypeFactory node={row} />,
      renderEditCell: (params) => <RenderEditCellTypeFactory {...params} />,
    },
  ];

  return (
    <Box role="restrictions-management-container" >
      <Typography variant="h4">Restrições do material</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra as atuais restrições para este material.</p>
        <p>
          Quando essas condições são quebradas o modelo é considerado{" "}
          <strong>inválido</strong>.
        </p>
      </Typography>
      <CRUDGrid
        addLabel="Adicionar restrição"
        newRecord={() => {
          const id = _.uniqueId("hard-restriction-")
          return { id, label:"Nova restricao", operand:[], restrictionType: 'allowOnly', attribute: 'materialType' }
        }}
        columns={columns as GridColDef[]} // QUESTION: how to remove type enforcement?
      />
    </Box>
  );
}