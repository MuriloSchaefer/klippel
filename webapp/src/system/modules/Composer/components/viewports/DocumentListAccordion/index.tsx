import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { DOCUMENT_KIND_ATTACHMENT, type DocumentNode } from "../../../typings";
import AddDocumentButton from "./AddDocumentButton";
import DocumentItem from "./DocumentItem";

/**
 * Files attached to the model.
 *
 * Lists only DOCUMENT nodes of kind `attachment`. The graph holds a second
 * flavour of DOCUMENT — a logo's own artwork, parented to its LOGO node — which
 * is an implementation detail of the Logos accordion and has no business
 * appearing here.
 */
function DocumentListAccordion({
  variationId,
  garmentId = "garment",
}: Readonly<{ variationId: string; garmentId?: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const documentNodes = useAppSelector(
    (s: any): DocumentNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is DocumentNode =>
          n.type === "DOCUMENT" && n.kind === DOCUMENT_KIND_ATTACHMENT,
      );
    },
    shallowEqual,
  );

  return (
    <Box
      data-testid="document-list"
      // Row-count mirror for e2e waits (e2e-tests.md §2) — an upload is an
      // async IPC round-trip, so tests need a signal that the row landed.
      data-document-count={documentNodes.length}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddDocumentButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {documentNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum documento
            </Typography>
          </ListItem>
        ) : (
          documentNodes.map((node) => (
            <DocumentItem key={node.id} node={node} variationId={variationId} />
          ))
        )}
      </List>
    </Box>
  );
}

export default React.memo(DocumentListAccordion);
