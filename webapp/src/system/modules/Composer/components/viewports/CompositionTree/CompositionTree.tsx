import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import Node from "@kernel/modules/Graphs/interfaces/Node";
import { GraphState } from "@kernel/modules/Graphs/store/state";
import { alpha, Box, styled, useTheme } from "@mui/material";
import { RichTreeView, TreeItem2Content, TreeItem2GroupTransition, TreeItem2Icon, TreeItem2IconContainer, TreeItem2Label, TreeItem2Provider, TreeItem2Root, treeItemClasses, useTreeItem2, UseTreeItem2Parameters } from "@mui/x-tree-view";
import useVariation from "@system/modules/Composer/hooks/useVariation";
import React, { useMemo } from "react";
import AddPartButton from "./AddPartButton";
import RemovePartButton from "./RemovePartButton";
type Item = {
  id: string;
  label: string;
  children: Item[];
};
function buildSubTree(graph: GraphState, root: Node): Item { // TODO: Add typing for nodes and edges
  const children = Object.values(graph.edges)
    .filter((e) => e.sourceId == root.id && e.type === "HAS_PART")
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
  } = useTreeItem2({ id, itemId, children, label, disabled, rootRef: ref });

  const modelVariation = useVariation({variationId})
  
  return (
    <TreeItem2Provider itemId={itemId} >
      <TreeItem2Root {...getRootProps(other)}>
        <CustomTreeItemContent {...getContentProps()} >
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
            {modelVariation.state?.selectedPart === itemId && (
              <>
                <AddPartButton
                  variationId={variationId}
                  parentId={itemId}
                />
                <RemovePartButton
                  variationId={variationId}
                  itemId={itemId}
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

export default function CompositionTree({
  variationId,
}: {
  variationId: string;
}) {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;
  const graph = useGraph(variationId, (g) => g);
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

  const modelVariation = useVariation({variationId})
  return (
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
          variationId: variationId
        },
      }}
      onItemSelectionToggle={(e, itemId, selected) => {
        if (selected) modelVariation.actions.selectPart(itemId);
      }}
      sx={{ flexGrow: 1, maxWidth: "100%", overflowY: "auto" }}
    />
  );
}
