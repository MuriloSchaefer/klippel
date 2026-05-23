import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { VisualizationNode } from "../../../typings";
import AddVisualizationButton from "./AddVisualizationButton";
import VisualizationItem from "./VisualizationItem";

function VisualizationListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const visualizationNodes = useAppSelector(
    (s: any): VisualizationNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is VisualizationNode => n.type === "VISUALIZATION",
      );
    },
    shallowEqual,
  );

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

export default React.memo(VisualizationListAccordion);
