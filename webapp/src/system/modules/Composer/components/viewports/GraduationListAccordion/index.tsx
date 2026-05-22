import React, { useCallback, useRef } from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../hooks/useVariationActions";
import AddGraduationButton from "./AddGraduationButton";
import GraduationItem from "./GraduationItem";

function GraduationListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { actions } = useVariationActions({ variationId });

  // Returns sorted IDs only — strings are stable under shallowEqual even when
  // the computation middleware adds computedProcessTime to graduation nodes.
  const sortedGraduationIds = useAppSelector(
    (s: any): string[] => {
      const graph = s.Graph?.graphs?.[variationId];
      if (!graph) return [];
      const pairs: { id: string; order: number }[] = [];
      for (const e of Object.values(graph.edges) as any[]) {
        if (e.sourceId !== garmentId || e.type !== "HAS_GRADUATION") continue;
        const n = graph.nodes[e.targetId];
        if (!n || n.type !== "GRADUATION") continue;
        pairs.push({ id: n.id, order: n.order ?? 0 });
      }
      pairs.sort((a, b) => a.order - b.order);
      return pairs.map((p) => p.id);
    },
    shallowEqual,
  );

  const idsRef = useRef(sortedGraduationIds);
  idsRef.current = sortedGraduationIds;

  const moveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const ids = [...idsRef.current];
      [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
      actions.reorderGraduations(ids);
    },
    [actions],
  );

  const moveDown = useCallback(
    (index: number) => {
      const ids = idsRef.current;
      if (index >= ids.length - 1) return;
      const copy = [...ids];
      [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
      actions.reorderGraduations(copy);
    },
    [actions],
  );

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddGraduationButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {sortedGraduationIds.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhuma graduação
            </Typography>
          </ListItem>
        ) : (
          sortedGraduationIds.map((id, idx) => (
            <GraduationItem
              key={id}
              nodeId={id}
              variationId={variationId}
              index={idx}
              moveUp={moveUp}
              moveDown={moveDown}
              canMoveUp={idx > 0}
              canMoveDown={idx < sortedGraduationIds.length - 1}
            />
          ))
        )}
      </List>
    </>
  );
}

export default React.memo(GraduationListAccordion);
