import React from "react";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/GraphsModule";

import {
  AdjacencyList,
  EdgesHashMap,
} from "@kernel/modules/GraphsModule/store/state";

import { CompositionGraphState } from "../../../store/state";
import { MemoizedTreeItem as TreeItem } from "./TreeItem";

export interface CompositionTreeProps {
  graphId: string;
  rootId?: string;
}

const CompositionTree = ({
  graphId,
  rootId = "root",
}: CompositionTreeProps): React.ReactElement => {
  const graphModule = useModule<IGraphModule>("GraphModule");


  const selectInfo = (g: CompositionGraphState | undefined) => g && ({ adjacencyList: g.adjacencyList, edges: g.edges })

  const { state } = graphModule.hooks.module.useGraph<
    CompositionGraphState,
    { adjacencyList: AdjacencyList; edges: EdgesHashMap }
  >(graphId, selectInfo);

  if (!state) return <></>;

  return <TreeItem key={`${graphId}-${rootId}`} graphId={graphId} nodeId={rootId} />
};

CompositionTree.defaultProps = {
  rootId: "root",
};

export default React.memo(CompositionTree);
