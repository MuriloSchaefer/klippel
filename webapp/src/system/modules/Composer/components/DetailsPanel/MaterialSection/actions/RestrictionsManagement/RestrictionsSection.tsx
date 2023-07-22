import { useContext, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";

import {
  CompositionEdge,
  MaterialUsageNode,
} from "../../../../../store/composition/state";
import { RestrictionsProps } from "./Container";

export default ({ compositionState, materialUsageId }: RestrictionsProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

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
    return _.uniqueId("search-restrictions") // id used to cache restrictions search results
  }, [materialUsageId])

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

  const restrictions = useSearchResult(
    compositionState.graphId,
    searchResultPath
  );

  const { setRows } = useContext(CRUDGridContext);

  useEffect(() => {
    console.log(restrictions);
    setRows([]);
  }, [restrictions]);

  return (
    <Box role="restrictions-management-container">
      <Typography variant="h4">Restrições do material</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra as atuais restrições para este material.</p>
      </Typography>
      <CRUDGrid columns={[]} />
    </Box>
  );
};
