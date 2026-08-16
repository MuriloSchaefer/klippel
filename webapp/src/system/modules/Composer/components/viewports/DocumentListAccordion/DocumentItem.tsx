import React, { useCallback, useRef, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  ListItem,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  DeleteOutlineSharp,
  DownloadOutlined,
  EditOutlined,
  LaunchOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";
import type { DocumentNode } from "../../../typings";
import DocumentPreview from "./DocumentPreview";

const jazz = globalThis.electron.jazz;

/** 1 decimal place, binary units — enough to tell 900 KB from 9 MB at a glance. */
const humanSize = (bytes?: number): string => {
  if (bytes === undefined) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? value : value.toFixed(1)} ${units[unit]}`;
};

function DocumentItem({
  node,
  variationId,
}: Readonly<{ node: DocumentNode; variationId: string }>) {
  const theme = useTheme();
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { actions } = useVariationActions({ variationId });

  const [isFocused, setIsFocused] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(node.label ?? node.filename ?? "");
  const [preview, setPreview] = useState<{ bytes: ArrayBuffer; mime: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const rowRef = useRef<HTMLLIElement | null>(null);

  const name = node.label ?? node.filename ?? node.documentId;

  /**
   * Bytes are never held in Redux, so every action that needs them fetches
   * first. Failures are surfaced on the row rather than thrown: a peer may have
   * deleted the blob since this node was written, which is a normal outcome.
   */
  const withBytes = useCallback(
    async (fn: (payload: { bytes: ArrayBuffer; mime: string; filename: string }) => Promise<void> | void) => {
      setError(null);
      try {
        const payload = await actions.readDocument(node.id);
        if (!payload) {
          setError("Arquivo indisponível");
          return;
        }
        await fn(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [actions, node.id],
  );

  const commitRename = () => {
    setRenaming(false);
    actions.renameDocument(node.id, draft);
  };

  return (
    <ListItem
      ref={rowRef}
      id={node.id}
      data-testid="document-item"
      data-document-label={name}
      data-document-id={node.documentId}
      tabIndex={0}
      onFocus={(e) => {
        if (e.currentTarget === e.target) setIsFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      sx={{
        mb: 0.5,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        border: "1px solid",
        borderColor: isFocused ? theme.palette.primary.main : "divider",
        borderRadius: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          gap: 1,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {renaming ? (
            <TextField
              autoFocus
              size="small"
              fullWidth
              value={draft}
              slotProps={{
                htmlInput: { "data-testid": "document-rename-input" },
              }}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setDraft(name);
                  setRenaming(false);
                }
              }}
            />
          ) : (
            <Typography noWrap title={node.filename ?? name}>
              {name}
            </Typography>
          )}
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 0.25 }}>
            <Chip size="small" label={node.mime} />
            <Typography variant="caption" color="text.secondary">
              {humanSize(node.size)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center" }}>
          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/DocumentList/previewDocument`}
            alwaysShow={isFocused}
          >
            <Tooltip title="Pré-visualizar">
              <IconButton
                size="small"
                data-testid={`document-row-preview-${node.documentId}`}
                onClick={() =>
                  preview
                    ? setPreview(null)
                    : withBytes(({ bytes, mime }) => setPreview({ bytes, mime }))
                }
              >
                <VisibilityOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </ShortcutHint>

          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/DocumentList/renameDocument`}
            alwaysShow={isFocused}
          >
            <Tooltip title="Renomear">
              <IconButton
                size="small"
                data-testid={`document-row-rename-${node.documentId}`}
                onClick={() => {
                  setDraft(name);
                  setRenaming(true);
                }}
              >
                <EditOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </ShortcutHint>

          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/DocumentList/openDocument`}
            alwaysShow={isFocused}
          >
            <Tooltip title="Abrir no aplicativo padrão">
              <IconButton
                size="small"
                data-testid={`document-row-open-${node.documentId}`}
                onClick={() =>
                  withBytes(async ({ bytes, filename }) => {
                    const result = await jazz.documents.open({ filename, bytes });
                    if (!result.opened && result.error) setError(result.error);
                  })
                }
              >
                <LaunchOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </ShortcutHint>

          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/DocumentList/saveDocumentAs`}
            alwaysShow={isFocused}
          >
            <Tooltip title="Salvar como…">
              <IconButton
                size="small"
                data-testid={`document-row-save-${node.documentId}`}
                onClick={() =>
                  withBytes(async ({ bytes, filename }) => {
                    await jazz.documents.saveAs({ filename, bytes });
                  })
                }
              >
                <DownloadOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </ShortcutHint>

          <ShortcutHint
            placement="top-center"
            shortcutId={`${MODULE_NAME}/DocumentList/deleteDocument`}
            alwaysShow={isFocused}
          >
            <Tooltip title="Excluir">
              <IconButton
                size="small"
                data-testid={`document-row-delete-${node.documentId}`}
                onClick={() => actions.deleteDocument(node.id)}
              >
                <DeleteOutlineSharp fontSize="small" />
              </IconButton>
            </Tooltip>
          </ShortcutHint>
        </Box>
      </Box>

      {error ? (
        <Typography
          data-testid="document-row-error"
          variant="caption"
          color="error"
        >
          {error}
        </Typography>
      ) : null}

      {preview ? (
        <DocumentPreview bytes={preview.bytes} mime={preview.mime} />
      ) : null}
    </ListItem>
  );
}

export default React.memo(DocumentItem);
