import { useContext, useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";


import { RestrictionsProps } from "./Container";
import {
  MaterialUsageNode,
} from "../../../../../store/composition/state";

export default ({ compositionState, materialUsageId }: RestrictionsProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { useGraph, useSearchResult } = graphModule.hooks;
  const { CRUDGridContext } = layoutModule.contexts;
  const { CRUDGrid } = layoutModule.components;

  const { state: node, actions: {search} } = useGraph<MaterialUsageNode>(
    compositionState.graphId,
    g => g?.nodes[materialUsageId]
  );
  const searchResultPath = useMemo(() => {
    if (!node) return ""; // TODO: loading
    return search('bfs', node?.id, ()=> true, () => false);
  }, [node]);

  const result = useSearchResult(compositionState.graphId, searchResultPath)

  const { setRows } = useContext(CRUDGridContext);

  useEffect(
    () =>
      setRows(
        []
      ),
    [result]
  );

  return (
    <Box role="restrictions-management-container">
      <Typography variant="h4">Contra indicações do material</Typography>
      <Typography component="div">
        <p>A tabela abaixo mostra contra indicações para este material.</p>
      </Typography>
      <CRUDGrid
        columns={[]}
      />
    </Box>
  );
};
