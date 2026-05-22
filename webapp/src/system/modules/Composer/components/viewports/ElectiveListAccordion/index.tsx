import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { ElectiveNode } from "../../../typings";
import AddElectiveButton from "./AddElectiveButton";
import ElectiveItem from "./ElectiveItem";

function ElectiveListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const electiveNodes = useAppSelector(
    (s: any): ElectiveNode[] => {
      const graph = s.Graph?.graphs?.[variationId];
      if (!graph) return [];
      return (Object.values(graph.edges) as any[])
        .filter((e) => e.sourceId === garmentId && e.type === "HAS_ELECTIVE")
        .map((e) => graph.nodes[e.targetId])
        .filter((n: any): n is ElectiveNode => !!n && n.type === "ELECTIVE");
    },
    shallowEqual,
  );

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

export default React.memo(ElectiveListAccordion);
