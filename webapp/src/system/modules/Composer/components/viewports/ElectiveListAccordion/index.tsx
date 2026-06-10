import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { ElectiveNode } from "../../../typings";
import { GARMENT_ROOT_ID } from "../../../constants";
import AddElectiveButton from "./AddElectiveButton";
import ElectiveItem from "./ElectiveItem";

function ElectiveListAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  // Electives only ever link to the root garment node (sub-parts not yet
  // designed), so a variation-wide list is the garment-scoped list.
  const electiveNodes = useAppSelector(
    (s: any): ElectiveNode[] => {
      const graph = s.Graph?.graphs?.[variationId];
      if (!graph) return [];
      return (Object.values(graph.edges) as any[])
        .filter(
          (e) => e.sourceId === GARMENT_ROOT_ID && e.type === "HAS_ELECTIVE",
        )
        .map((e) => graph.nodes[e.targetId])
        .filter((n: any): n is ElectiveNode => !!n && n.type === "ELECTIVE");
    },
    shallowEqual,
  );

  return (
    <Box data-testid="elective-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddElectiveButton variationId={variationId} />
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
