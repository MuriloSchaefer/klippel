import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import { alpha, Box, styled, useTheme } from "@mui/material";
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
import useVariation from "@system/modules/Composer/hooks/useVariation";
import React, { useMemo } from "react";
import AddPartButton from "./AddPartButton";
import RemovePartButton from "./RemovePartButton";
import { VariationGraphState } from "@system/modules/Composer/typings";
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

  const {
    getRootProps,
    getContentProps,
    getIconContainerProps,
    getLabelProps,
    getGroupTransitionProps,
    status,
  } = useTreeItem({ id, itemId, children, label, disabled, rootRef: ref });

  const modelVariation = useVariation({ variationId });

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
            {modelVariation.state?.selectedPart === itemId && (
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
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;
  const graph = useGraph<VariationGraphState>(variationId);
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

  const modelVariation = useVariation({ variationId });
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
        if (selected) modelVariation.actions.selectPart(itemId);
      }}
      sx={{ flexGrow: 1, maxWidth: "100%", overflowY: "auto" }}
    />
    </Box>
  );
}
