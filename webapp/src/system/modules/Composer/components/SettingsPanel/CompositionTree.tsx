import React, { useCallback, useMemo } from "react";
import { alpha, styled, useTheme } from "@mui/material/styles";
import {
  RichTreeView,
  treeItemClasses,
  UseTreeItem2Parameters,
  useTreeItem2,
  TreeItem2Provider,
  TreeItem2Root,
  TreeItem2IconContainer,
  TreeItem2Icon,
  TreeItem2Label,
  TreeItem2GroupTransition,
  TreeItem2Content,
} from "@mui/x-tree-view";
import Box from "@mui/material/Box";

import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import useComposition from "../../hooks/useComposition";
import {
  CompositionGraph,
  CompositionNode,
  CompositionState,
} from "../../store/composition/state";
import AddPartButton from "./AddPartButton";
import RemovePartButton from "./RemovePartButton";

type Item = {
  id: string;
  label: string;
  children: Item[];
};

function buildSubTree(graph: CompositionGraph, root: CompositionNode): Item {
  const children = Object.values(graph.edges)
    .filter((e) => e.sourceId == root.id && e.type === "COMPOSED_OF")
    .map((e) => {
      return buildSubTree(graph, graph.nodes[e.targetId]);
    });

  return { id: root.id, label: root.label ?? "", children };
}

const CustomTreeItemContent = styled(TreeItem2Content)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(0.5),
  margin: theme.spacing(0.2, 0),
  [`& .${treeItemClasses.label}`]: {
    fontSize: "0.8rem",
    fontWeight: 500,
  },
}));

interface CustomTreeItemProps
  extends Omit<UseTreeItem2Parameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
  compositionName: string;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: React.Ref<HTMLLIElement>
) {
  const { id, itemId, label, disabled, children, compositionName, ...other } =
    props;
  const theme = useTheme();

  const {
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getLabelProps,
    getGroupTransitionProps,
    status,
  } = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref });

  const { state: selectedId } = useComposition(
    { compositionName },
    (c) => c?.selectedPart
  );
  
  return (
    <TreeItem2Provider itemId={itemId}>
      <TreeItem2Root {...getRootProps(other)}>
        <CustomTreeItemContent {...getContentProps()}>
          {children && <TreeItem2IconContainer
            {...getIconContainerProps()}
            sx={{
              borderRadius: "50%",
              backgroundColor: theme.palette.primary.dark,
              padding: theme.spacing(0, 1.2),
              ...theme.applyStyles("light", {
                backgroundColor: alpha(theme.palette.primary.main, 0.25),
              }),
              ...theme.applyStyles("dark", {
                color: theme.palette.primary.contrastText,
              }),
            }}
          >
            <TreeItem2Icon status={status} />
          </TreeItem2IconContainer>}
          <Box
            sx={{ flexGrow: 1, display: "flex", gap: 1, alignItems: "center" }}
          >
            <TreeItem2Label {...getLabelProps()} />
            {selectedId === itemId && (
              <>
                <AddPartButton
                  compositionName={compositionName}
                  parentId={itemId}
                />
                <RemovePartButton
                  compositionName={compositionName}
                  nodeId={itemId}
                />
              </>
            )}
          </Box>
          {/* <TreeItem2DragAndDropOverlay {...getDragAndDropOverlayProps()} /> */}
        </CustomTreeItemContent>
        {children && (
          <TreeItem2GroupTransition
            {...getGroupTransitionProps()}
            sx={{
              marginLeft: 3,
              paddingLeft: 0,
              borderLeft: `1px dashed ${alpha(
                theme.palette.text.primary,
                0.4
              )}`,
            }}
          />
        )}
      </TreeItem2Root>
    </TreeItem2Provider>
  );
});

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
  const composition = useComposition(
    { viewportName: activeViewport! },
    selector
  );
  const graph = useGraph<CompositionGraph>(activeViewport!, (g) => g);

  const tree = useMemo(() => {
    if (!graph.state) return [];

    return Object.values(graph.state.nodes).reduce((acc, curr) => {
      if (curr.type === "GARMENT") {
        let root = buildSubTree(graph.state!, curr);

        return [...acc, root];
      }

      return acc;
    }, [] as Item[]);
  }, [graph.state]);

  return (
    <RichTreeView
      items={tree}
      aria-label="composition tree"
      // defaultExpanded={["root"]}
      defaultExpandedItems={["garment"]}
      // defaultCollapseIcon={<MinusSquare />}
      // defaultExpandIcon={<PlusSquare />}
      // defaultEndIcon={<CloseSquare />}
      onItemClick={(e, id) => composition.actions.selectPart(id)}
      slots={{
        // @ts-ignore
        item: CustomTreeItem,
      }}
      slotProps={{
        // @ts-ignore
        item: { compositionName: composition.state!.name },
      }}
      sx={{ flexGrow: 1, maxWidth: "100%", overflowY: "auto" }}
    />
  );
}
