import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { AnnotationNode } from "../../../typings";
import AddAnnotationButton from "./AddAnnotationButton";
import AnnotationItem from "./AnnotationItem";

function AnnotationListAccordion({
  variationId,
  garmentId = "garment",
}: Readonly<{ variationId: string; garmentId?: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const annotationNodes = useAppSelector(
    (s: any): AnnotationNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is AnnotationNode => n.type === "ANNOTATION",
      );
    },
    shallowEqual,
  );

  return (
    <Box data-testid="annotation-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddAnnotationButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {annotationNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhuma anotação
            </Typography>
          </ListItem>
        ) : (
          annotationNodes.map((node) => (
            <AnnotationItem
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

export default React.memo(AnnotationListAccordion);
