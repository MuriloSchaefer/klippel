import {
  GridColDef,
  GridValidRowModel,
} from "@mui/x-data-grid";
import { useContext, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";

// QUESTION: how to share intefaces without direct import?
import { IMaterialsModule } from "@system/modules/Materials";

import {
  CompositionEdge,
  MaterialUsageNode,
  RestrictionNode,
} from "../../../../../store/composition/state";
import { RestrictionsProps } from "./Container";

export default ({ compositionState, materialUsageId }: RestrictionsProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const {
    components: { CRUDMaterialTypeCell },
  } = useModule<IMaterialsModule>("Materials");

  const { useGraph, useSearchResult } = graphModule.hooks;
  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid } = layoutModule.components;

  const {
    state: node,
    actions: { search },
  } = useGraph<MaterialUsageNode, CompositionEdge>(
    compositionState.graphId,
    (g) => g?.nodes[materialUsageId]
  );
  const searchId = useMemo(() => {
    return _.uniqueId("search-restrictions"); // id used to cache restrictions search results
  }, [materialUsageId]);

  const searchResultPath = useMemo(() => {
    if (!node) return ""; // TODO: loading
    return search(
      "bfs",
      node.id,
      (n, g) => {
        if (n.type !== "RESTRICTION") return false;
        const neighbours = g.adjacencyList[n.id];
        const result = neighbours.inputs.some((neighbour) => {
          const edge = g.edges[neighbour] as CompositionEdge;

          return edge.type === "RESTRICTED_BY" && edge.attr === "materialType";
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
  }, [node]);

  const restrictions = useSearchResult<RestrictionNode>(
    compositionState.graphId,
    searchResultPath
  );

  const { setRows } = useContext(CRUDGridContext);

  useEffect(() => {
    if (restrictions) setRows(restrictions.findings);
  }, [restrictions]);

  const columns = useMemo(() => {
    const typesOfRestrictions = restrictions.findings.map(
      (restriction) => restriction.restrictionType
    );
    const usedColumns: GridColDef<GridValidRowModel>[] = [
      {
        field: "label",
        editable: true,
        flex: 1,
        width: 100,
        minWidth: 200,
        maxWidth: 400,
        renderHeader: () => "Restrição",
        // renderEditCell: (params: GridRenderEditCellParams) => (
        //   <div>{params.row.id}</div>
        // ),
      },
    ];
    if (typesOfRestrictions.includes("allowOnly")) {
      usedColumns.push({
        field: "allowOnly",
        editable: true,
        flex: 1,
        width: 100,
        minWidth: 200,
        maxWidth: 400,
        renderHeader: () => "permitido apenas",
        // renderCell: ({ value }) => (
        //   <MaterialTypeSelector value={value} disabled multiple />
        // ),
        renderEditCell: (params) => <CRUDMaterialTypeCell {...params}/>,
      });
    }

    return usedColumns;
  }, [restrictions.findings]);

  return (
    <Box role="restrictions-management-container">
      <Typography variant="h4">Restrições do material</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra as atuais restrições para este material.</p>
      </Typography>
      <CRUDGrid newRecord={() => ({id: _.uniqueId('restriction-')})} addLabel="Adicionar restrição" columns={columns} rowHeight={80}/>
    </Box>
  );
};
