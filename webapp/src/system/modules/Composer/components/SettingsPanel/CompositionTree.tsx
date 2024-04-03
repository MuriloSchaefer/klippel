import React, { useCallback } from "react";
import { animated, useSpring } from "@react-spring/web";
import SvgIcon, { SvgIconProps } from "@mui/material/SvgIcon";
import { alpha, styled } from "@mui/material/styles";
import TreeView from "@mui/lab/TreeView";
import TreeItem, { TreeItemProps, treeItemClasses } from "@mui/lab/TreeItem";
import Collapse from "@mui/material/Collapse";
import Box from "@mui/material/Box";
import { TransitionProps } from "@mui/material/transitions";

import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import {
  AdjacencyList,
  EdgesHashMap,
  GraphState,
  NodeConnections,
} from "@kernel/modules/Graphs/store/state";

import useComposition from "../../hooks/useComposition";
import {
  CompositionGraph,
  CompositionNode,
  CompositionState,
} from "../../store/composition/state";
import AddPartButton from "./AddPartButton";
import RemovePartButton from "./RemovePartButton";

function MinusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 11.023h-11.826q-.375 0-.669.281t-.294.682v0q0 .401.294 .682t.669.281h11.826q.375 0 .669-.281t.294-.682v0q0-.401-.294-.682t-.669-.281z" />
    </SvgIcon>
  );
}

function PlusSquare(props: SvgIconProps) {
  return (
    <SvgIcon fontSize="inherit" style={{ width: 14, height: 14 }} {...props}>
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0zM17.873 12.977h-4.923v4.896q0 .401-.281.682t-.682.281v0q-.375 0-.669-.281t-.294-.682v-4.896h-4.923q-.401 0-.682-.294t-.281-.669v0q0-.401.281-.682t.682-.281h4.923v-4.896q0-.401.294-.682t.669-.281v0q.401 0 .682.281t.281.682v4.896h4.923q.401 0 .682.281t.281.682v0q0 .375-.281.669t-.682.294z" />
    </SvgIcon>
  );
}

function CloseSquare(props: SvgIconProps) {
  return (
    <SvgIcon
      className="close"
      fontSize="inherit"
      style={{ width: 14, height: 14 }}
      {...props}
    >
      {/* tslint:disable-next-line: max-line-length */}
      <path d="M17.485 17.512q-.281.281-.682.281t-.696-.268l-4.12-4.147-4.12 4.147q-.294.268-.696.268t-.682-.281-.281-.682.294-.669l4.12-4.147-4.12-4.147q-.294-.268-.294-.669t.281-.682.682-.281.696 .268l4.12 4.147 4.12-4.147q.294-.268.696-.268t.682.281 .281.669-.294.682l-4.12 4.147 4.12 4.147q.294.268 .294.669t-.281.682zM22.047 22.074v0 0-20.147 0h-20.12v0 20.147 0h20.12zM22.047 24h-20.12q-.803 0-1.365-.562t-.562-1.365v-20.147q0-.776.562-1.351t1.365-.575h20.147q.776 0 1.351.575t.575 1.351v20.147q0 .803-.575 1.365t-1.378.562v0z" />
    </SvgIcon>
  );
}

function TransitionComponent(props: TransitionProps) {
  const style = useSpring({
    from: {
      opacity: 0,
      transform: "translate3d(20px,0,0)",
    },
    to: {
      opacity: props.in ? 1 : 0,
      transform: `translate3d(${props.in ? 0 : 20}px,0,0)`,
    },
  });

  return (
    <animated.div style={style}>
      <Collapse {...props} />
    </animated.div>
  );
}

const StyledTreeItem = styled((props: TreeItemProps) => (
  <TreeItem {...props} TransitionComponent={TransitionComponent} />
))(({ theme }) => ({
  [`& .${treeItemClasses.iconContainer}`]: {
    "& .close": {
      opacity: 0.3,
    },
  },
  [`& .${treeItemClasses.group}`]: {
    marginLeft: 15,
    paddingLeft: 18,
    borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
  },
}));

function Subtree({
  compositionName,
  graphId,
  selectedPart,
  selectPart,
  nodeId,
}: {
  compositionName: string;
  graphId: string;
  selectedPart: string | undefined;
  selectPart: (partName: string) => void;
  nodeId: string;
}) {
  const graphsModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphsModule.hooks;

  const info = useGraph<
    CompositionGraph,
    { node: CompositionNode; edges: EdgesHashMap; connections: NodeConnections }
  >(
    graphId,
    (g) =>
      g &&
      g.adjacencyList[nodeId] && {
        node: g.nodes[nodeId],
        edges: g.edges
          ? Object.values(g.edges).reduce(
              (acc, edge) =>
                g.adjacencyList[nodeId].outputs.includes(edge.id)
                  ? { ...acc, [edge.id]: edge }
                  : acc,
              {}
            )
          : {},
        connections: g.adjacencyList[nodeId],
      }
  );

  if (!info.state) return <></>;

  return (
    <Box sx={{ color: "text.primary" }}>
      <StyledTreeItem
        nodeId={nodeId}
        label={
          <Box
            sx={{ height: "30px", alignItems: "center", display: "flex" }}
            onClick={(e) => {
              if (nodeId !== selectedPart) {
                selectPart(nodeId);
                e.stopPropagation();
              }

            }}
          >
            {info.state.node.label}
            {nodeId === selectedPart && (
              <>
              <AddPartButton compositionName={compositionName} />
              <RemovePartButton compositionName={compositionName} />
              </>
            )}
          </Box>
        }
        onClick={() => {
          selectPart(nodeId);
        }}
        sx={{
          color:
            nodeId === selectedPart ? "secondary.main" : "secondary.secondary",
        }}
      >
        {info.state.connections.outputs
          .filter((out) => info.state?.edges[out].type === "COMPOSED_OF")
          .map(
            (child) =>
              info.state && (
                <MemoizedSubTree
                  compositionName={compositionName}
                  key={`${nodeId}-${info.state?.edges[child].targetId}`}
                  graphId={graphId}
                  selectPart={selectPart}
                  selectedPart={selectedPart}
                  nodeId={info.state.edges[child].targetId}
                />
              )
          )}
      </StyledTreeItem>
    </Box>
  );
}

const MemoizedSubTree = React.memo(Subtree);

export default function CompositionTree() {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphsModule = useModule<IGraphModule>("Graph");

  const { useAppSelector } = storeModule.hooks;
  const { useGraph } = graphsModule.hooks;
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const selector = useCallback(
    (c: CompositionState | undefined) => ({
      name: c?.name,
      svgPath: c?.svgPath,
      graphId: c?.graphId,
      selectedPart: c?.selectedPart,
    }),
    []
  );
  const composition = useComposition({viewportName: activeViewport!}, selector);
  const graph = useGraph<CompositionGraph, AdjacencyList>(
    activeViewport!,
    (g) => g?.adjacencyList
  );

  // QUESTION: how to make next if statement cleaner?
  if (
    !composition.state?.svgPath ||
    !composition.state?.graphId ||
    !composition.state?.name ||
    !graph
  )
    return null;

  return (
    <TreeView
      aria-label="composition tree"
      defaultExpanded={["root"]}
      defaultCollapseIcon={<MinusSquare />}
      defaultExpandIcon={<PlusSquare />}
      defaultEndIcon={<CloseSquare />}
      sx={{ flexGrow: 1, maxWidth: "100%", overflowY: "auto" }}
    >
      <MemoizedSubTree
        compositionName={composition.state.name}
        nodeId="garment"
        graphId={composition.state.graphId}
        selectPart={composition.actions.selectPart}
        selectedPart={composition.state.selectedPart}
      />
    </TreeView>
  );
}
