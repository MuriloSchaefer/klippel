import { useRef, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";

/**
 * Upload any file as a model attachment.
 *
 * The picker carries no `accept` filter on purpose — the feature is "any file",
 * and the only thing the app cares about is the byte count. The one rule worth
 * surfacing is the size cap, which main enforces
 * (`MAX_DOCUMENT_BYTES`); we render whatever it rejects with so the user gets a
 * reason rather than a silent no-op.
 */
export default function AddDocumentButton({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { actions } = useVariationActions({ variationId });

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      await actions.addDocument({
        filename: file.name,
        // Browsers leave `type` empty for extensions they don't know; the
        // generic binary type is the honest fallback.
        mime: file.type || "application/octet-stream",
        bytes,
        garmentId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      // Clear the input so picking the same file twice still fires `change`.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Box>
      <Button
        id="composer-add-document"
        data-testid="add-document"
        aria-label="add-document"
        variant="outlined"
        color="primary"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/DocumentList/addDocument`}
        >
          <Typography>{busy ? "Enviando…" : "Adicionar Documento"}</Typography>
        </ShortcutHint>
      </Button>
      <input
        ref={fileRef}
        type="file"
        hidden
        data-testid="add-document-file-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {error ? (
        <Typography
          data-testid="add-document-error"
          color="error"
          variant="caption"
          sx={{ display: "block", mt: 0.5 }}
        >
          {error}
        </Typography>
      ) : null}
    </Box>
  );
}
