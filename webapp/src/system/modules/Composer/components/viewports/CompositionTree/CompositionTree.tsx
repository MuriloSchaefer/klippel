import useModule from "@kernel/hooks/useModule";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import { Store } from "@kernel/modules/Store";
import { alpha, Box, styled, useTheme } from "@mui/material";
import { shallowEqual } from "react-redux";
import {
  RichTreeView,
  TreeItemContent,
  TreeItemGroupTransition,
  TreeItemIcon,
  TreeItemIconContainer,
  TreeItemLabel,
  TreeItemProvider,
  TreeItemRoot,
  treeItemClasses,
  useTreeItem,
  UseTreeItemParameters,
} from "@mui/x-tree-view";
import { useVariationActions } from "@system/modules/Composer/hooks/useVariationActions";
import { ComposerModuleState } from "@system/modules/Composer/typings";
import React, { useMemo } from "react";
import AddPartButton from "./AddPartButton";
import RemovePartButton from "./RemovePartButton";
type Item = {
  id: string;
  label: string;
  children: Item[];
};
function buildSubTree(graph: GraphState, root: Node): Item {
  const children = Object.values(graph.edges)
    .filter((e) => e.sourceId == root.id && e.type === "HAS_PART")
    .map((e) => {
      return buildSubTree(graph, graph.nodes[e.targetId]);
    });

  return { id: root.id, label: root.label ?? "", children };
}

const CustomTreeItemContent = styled(TreeItemContent)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.spacing(0.5),
  margin: theme.spacing(0.2, 0),
  [`& .${treeItemClasses.label}`]: {
    fontSize: "0.8rem",
    fontWeight: 500,
  },
}));

interface CustomTreeItemProps
  extends Omit<UseTreeItemParameters, "rootRef">,
    Omit<React.HTMLAttributes<HTMLLIElement>, "onFocus"> {
  variationId: string;
}

const CustomTreeItem = React.forwardRef(function CustomTreeItem(
  props: CustomTreeItemProps,
  ref: React.Ref<HTMLLIElement>
) {
  const { id, itemId, label, disabled, children, variationId, ...other } =
    props;
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const {
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getLabelProps,
    getGroupTransitionProps,
    status,
  } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

  const selectedPart = useAppSelector(
    (s: { Composer: ComposerModuleState }) => s.Composer?.variations?.[variationId]?.selectedPart,
  );

  return (
    <TreeItemProvider id={itemId} itemId={itemId}>
      <TreeItemRoot {...getRootProps(other)}>
        <CustomTreeItemContent {...getContentProps()}>
          {children && (
            <TreeItemIconContainer
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
              <TreeItemIcon status={status} />
            </TreeItemIconContainer>
          )}
          <Box
            sx={{ flexGrow: 1, display: "flex", gap: 1, alignItems: "center" }}
          >
            <TreeItemLabel {...getLabelProps()} />
            {selectedPart === itemId && (
              <>
                <AddPartButton variationId={variationId} parentId={itemId} />
                <RemovePartButton variationId={variationId} itemId={itemId} />
              </>
            )}
          </Box>
          {/* <TreeItem2DragAndDropOverlay {...getDragAndDropOverlayProps()} /> */}
        </CustomTreeItemContent>
        {children && (
          <TreeItemGroupTransition
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
      </TreeItemRoot>
    </TreeItemProvider>
  );
});

export default function CompositionTree({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const partNodes = useAppSelector(
    (s: any): Record<string, Node> => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return {};
      const result: Record<string, Node> = {};
      for (const n of Object.values(nodes) as any[]) {
        if (n.type === "GARMENT" || n.type === "PART") result[n.id] = n as Node;
      }
      return result;
    },
    shallowEqual,
  );

  const partEdges = useAppSelector(
    (s: any): Record<string, any> => {
      const edges = s.Graph?.graphs?.[variationId]?.edges;
      if (!edges) return {};
      const result: Record<string, any> = {};
      for (const e of Object.values(edges) as any[]) {
        if (e.type === "HAS_PART") result[e.id] = e;
      }
      return result;
    },
    shallowEqual,
  );

  const tree = useMemo(() => {
    const partialGraph = { nodes: partNodes, edges: partEdges } as unknown as GraphState;
    return Object.values(partNodes).reduce((acc, curr) => {
      if ((curr as any).type === "GARMENT") {
        return [...acc, buildSubTree(partialGraph, curr)];
      }
      return acc;
    }, [] as Item[]);
  }, [partNodes, partEdges]);

  const { actions } = useVariationActions({ variationId });
  return (
    <Box data-testid="composition-tree">
    <RichTreeView
      items={tree}
      aria-label="composition tree"
      defaultExpandedItems={["garment"]}
      slots={{
        // @ts-ignore
        item: CustomTreeItem,
      }}
      slotProps={{
        item: {
          // @ts-ignore
          variationId: variationId,
        },
      }}
      onItemSelectionToggle={(e, itemId, selected) => {
        if (selected) actions.selectPart(itemId);
      }}
      sx={{ flexGrow: 1, maxWidth: "100%", overflowY: "auto" }}
    />
    </Box>
  );
}
