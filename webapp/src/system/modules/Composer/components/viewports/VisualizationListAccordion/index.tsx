import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { VariationGraphState, VisualizationNode } from "../../../typings";
import AddVisualizationButton from "./AddVisualizationButton";
import VisualizationItem from "./VisualizationItem";

export default function VisualizationListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph<VariationGraphState>(variationId);

  const visualizationNodes = graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n): n is VisualizationNode => n.type === "VISUALIZATION",
      ))
    : [];

  return (
    <Box data-testid="visualization-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddVisualizationButton
          variationId={variationId}
          garmentId={garmentId}
        />
      </Box>

      <List sx={{ p: 0 }}>
        {visualizationNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhuma visualização
            </Typography>
          </ListItem>
        ) : (
          visualizationNodes.map((node) => (
            <VisualizationItem
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
