import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ElectiveNode, VariationGraphState } from "../../../typings";
import AddElectiveButton from "./AddElectiveButton";
import ElectiveItem from "./ElectiveItem";

export default function ElectiveListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph<VariationGraphState>(variationId);

  const electiveEdges = graph?.state
    ? Object.values(graph.state.edges).filter(
        (e: any) => e.sourceId === garmentId && e.type === "HAS_ELECTIVE",
      )
    : [];

  const electiveNodes = electiveEdges
    .map((e: any) => graph?.state?.nodes[e.targetId])
    .filter((n): n is ElectiveNode => !!n && n.type === "ELECTIVE");

  return (
    <Box data-testid="elective-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddElectiveButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {electiveNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum eletivo
            </Typography>
          </ListItem>
        ) : (
          electiveNodes.map((node) => (
            <ElectiveItem
              key={node.id}
              node={node}
              variationId={variationId}
            />
          ))
        )}
      </List>
    </Box>
  );
}
