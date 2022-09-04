import React from "react";
import { TreeItem } from "./TreeItem";

export interface CompositionTreeProps {
  graphId: string;
  rootId?: string;
}

const CompositionTree = ({
  graphId,
  rootId = "root",
}: CompositionTreeProps): React.ReactElement => (
  <TreeItem graphId={graphId} nodeId={rootId} />
);

CompositionTree.defaultProps = {
  rootId: "root",
};

export default CompositionTree;
