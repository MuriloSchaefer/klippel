import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import IosShareIcon from "@mui/icons-material/IosShare";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector, useCurrentWorkspace } from "../hooks";
import { selectModuleState } from "../selectors";
import { enableWorkspaceSync } from "../actions";

// Resolution order:
//   1. KLIPPEL_JAZZ_SYNC_URL — set by the e2e harness (random port per run)
//      and by VS Code launch configs that pin a specific sync server.
//   2. VITE_JAZZ_SYNC_URL — build-time fallback for packaged releases.
//   3. ws://127.0.0.1:4242 — `npm run jazz:sync` default.
const DEFAULT_SYNC_URL =
  (globalThis as unknown as {
    electron?: { env?: { KLIPPEL_JAZZ_SYNC_URL?: string } };
  }).electron?.env?.KLIPPEL_JAZZ_SYNC_URL ||
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_JAZZ_SYNC_URL ||
  "ws://127.0.0.1:4242";

export function ShareWorkspaceButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const dispatch = useAppDispatch();
  const workspace = useCurrentWorkspace();
  const coId = useAppSelector(
    selectModuleState("Store", (s) => s?.workspaceCoIds?.[workspace]),
  );

  const inviteUri = useMemo(() => {
    if (!coId) return "";
    return `klippel://join?coId=${encodeURIComponent(coId)}&syncUrl=${encodeURIComponent(DEFAULT_SYNC_URL)}`;
  }, [coId]);

  const handleCopy = useCallback((value: string) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
  }, []);

  const handleEnableSync = useCallback(() => {
    dispatch(enableWorkspaceSync({ syncUrl: DEFAULT_SYNC_URL }));
  }, [dispatch]);

  const disabled = !workspace || !coId;

  return (
    <PointerContainer
      component={
        // The data-* mirrors live on the form root (inside the pointer
        // panel's portal). PointerContainer does not forward custom props
        // to its rendered wrapper, so tests look for the share-workspace-*
        // attributes here instead of on the outer container.
        <Box
          data-testid="share-workspace-panel"
          data-share-coid={coId ?? ""}
          data-share-sync-url={DEFAULT_SYNC_URL}
          sx={{ display: "flex", flexDirection: "column", gap: 1, padding: 2, minWidth: 360 }}
        >
          <Typography sx={{ padding: 1, width: "100%", textAlign: "center" }}>
            Compartilhar ambiente
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Habilite a sincronização e compartilhe o coId + URL com outro usuário, ou copie o convite completo.
          </Typography>
          <ReadOnlyField label="coId" value={coId ?? ""} onCopy={handleCopy} testId="share-workspace-coid" />
          <ReadOnlyField label="Servidor de sincronização" value={DEFAULT_SYNC_URL} onCopy={handleCopy} testId="share-workspace-sync-url" />
          <ReadOnlyField label="Convite" value={inviteUri} onCopy={handleCopy} testId="share-workspace-invite" />
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          color="success"
          key="enable-sync"
          value="Habilitar sincronização"
          handleConfirm={handleEnableSync}
          disabled={disabled}
          data-testid="share-workspace-confirm"
        />,
      ]}
    >
      <Tooltip title={disabled ? "Selecione um ambiente para compartilhar" : "Compartilhar ambiente"}>
        <span>
          <IconButton disabled={disabled} data-testid="share-workspace-button">
            <IosShareIcon />
          </IconButton>
        </span>
      </Tooltip>
    </PointerContainer>
  );
}

function ReadOnlyField({
  label,
  value,
  onCopy,
  testId,
}: Readonly<{ label: string; value: string; onCopy: (v: string) => void; testId: string }>) {
  return (
    <Box sx={{ display: "flex", flexDirection: "row", gap: 1, alignItems: "flex-end" }}>
      <TextField
        label={label}
        value={value}
        variant="standard"
        fullWidth
        slotProps={{ input: { readOnly: true } }}
        data-testid={testId}
      />
      <Tooltip title="Copiar">
        <span>
          <IconButton
            size="small"
            onClick={() => onCopy(value)}
            disabled={!value}
            data-testid={`${testId}-copy`}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}
