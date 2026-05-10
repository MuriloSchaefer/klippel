import { useMemo } from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import useVariation from "../../../hooks/useVariation";
import type { GraduationNode, VariationGraphState } from "../../../typings";
import AddGraduationButton from "./AddGraduationButton";
import GraduationItem from "./GraduationItem";

export default function GraduationListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();
  const variation = useVariation({ variationId });

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph<VariationGraphState>(variationId);

  const graduationEdges = graph?.state
    ? Object.values(graph.state.edges).filter(
        (e: any) => e.sourceId === garmentId && e.type === "HAS_GRADUATION",
      )
    : [];

  const graduationNodes = graduationEdges
    .map((e: any) => graph.state?.nodes[e.targetId])
    .filter(Boolean) as GraduationNode[];

  const sortedGraduations = useMemo(() => {
    const copy = [...graduationNodes];
    copy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return copy;
  }, [graduationNodes]);

  const moveUp = (index: number) => {
    if (index <= 0) return;
    const ids = sortedGraduations.map((n) => n.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    variation.actions.reorderGraduations(ids);
  };

  const moveDown = (index: number) => {
    if (index >= sortedGraduations.length - 1) return;
    const ids = sortedGraduations.map((n) => n.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    variation.actions.reorderGraduations(ids);
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddGraduationButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {sortedGraduations.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhuma graduação
            </Typography>
          </ListItem>
        ) : (
          sortedGraduations.map((node, idx) => (
            <GraduationItem
              key={node.id}
              node={node}
              variationId={variationId}
              garmentId={garmentId}
              index={idx}
              moveUp={() => moveUp(idx)}
              moveDown={() => moveDown(idx)}
              canMoveUp={idx > 0}
              canMoveDown={idx < sortedGraduations.length - 1}
            />
          ))
        )}
      </List>
    </>
  );
}
