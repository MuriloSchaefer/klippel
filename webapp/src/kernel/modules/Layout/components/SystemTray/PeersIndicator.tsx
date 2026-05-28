import React, { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import CloudDoneSharpIcon from "@mui/icons-material/CloudDoneSharp";
import CloudOffSharpIcon from "@mui/icons-material/CloudOffSharp";
import RefreshSharpIcon from "@mui/icons-material/RefreshSharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import { Store } from "@kernel/modules/Store";
import { refreshFromPeers } from "@kernel/modules/Store/actions";

/**
 * Mirrors the `JazzSyncStatus` DTO exposed by
 * `window.electron.jazz.syncStatus`. Re-declared here so the
 * component doesn't pull the preload types into the renderer
 * bundle's type surface — the IPC payload is the contract.
 */
interface SyncStatus {
  workspaceName: string | null;
  workspaceCoId: string | null;
  syncUrl: string | null;
  syncOptIn: boolean;
  peers: string[];
  connected: boolean;
  accountId: string | null;
}

const POLL_INTERVAL_MS = 1000;

const EMPTY: SyncStatus = {
  workspaceName: null,
  workspaceCoId: null,
  syncUrl: null,
  syncOptIn: false,
  peers: [],
  connected: false,
  accountId: null,
};

/**
 * System-tray indicator for Jazz sync state. Polls
 * `window.electron.jazz.syncStatus()` once per second (cheap
 * in-memory read in the main process) and flips between
 * `CloudDoneSharp` (connected) and `CloudOffSharp` (disconnected /
 * no peer). A `Badge` overlays the peer count.
 *
 * Click opens a `PointerContainer` panel with the resolved sync URL,
 * the `syncOptIn` flag, the local accountId, and the peer-id list —
 * the same payload an engineer would otherwise dig out via DevTools.
 */
const PeersIndicator: React.FC = () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const storeModule = useModule<Store>("Store");
  const { PointerContainer } = pointerModule.components;
  const dispatch = storeModule.hooks.useAppDispatch();

  const [status, setStatus] = useState<SyncStatus>(EMPTY);

  const refresh = useCallback(async () => {
    try {
      const result = (await (
        globalThis as unknown as {
          electron?: { jazz?: { syncStatus?: () => Promise<SyncStatus> } };
        }
      ).electron?.jazz?.syncStatus?.()) ?? EMPTY;
      setStatus(result);
    } catch {
      setStatus(EMPTY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    // Eager first read so the icon doesn't flash "offline" for a
    // full second on mount.
    void tick();
    // Pause polling while the document is hidden — the tray icon
    // isn't visible anyway, and a background tab shouldn't keep
    // pinging IPC for no observable change.
    const start = () => {
      if (timer) return;
      timer = setInterval(() => void tick(), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void tick();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const tooltipTitle = status.connected
    ? status.peers.length === 1
      ? "1 peer conectado"
      : `${status.peers.length} peers conectados`
    : status.syncOptIn
    ? "Sincronização habilitada, sem peer conectado"
    : "Sincronização desabilitada";

  return (
    <PointerContainer
      component={
        <Box
          data-testid="peers-indicator-panel"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            padding: 2,
            minWidth: 320,
          }}
        >
          <Typography variant="overline" color="text.secondary">
            Sincronização
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography variant="caption" color="text.secondary">
              Use Atualizar para puxar dados sincronizados de outros peers.
            </Typography>
            <Tooltip title="Atualizar catálogo do servidor">
              <Button
                data-testid="peers-indicator-refresh"
                size="small"
                startIcon={<RefreshSharpIcon fontSize="small" />}
                onClick={() => {
                  // Kernel-level refresh command — the Store
                  // middleware emits `refreshFromPeers`, which each
                  // module (Materials, Composer, …) listens on to
                  // refetch its own workspace-scoped state from
                  // Jazz. Mirrors the saveSession orchestration so
                  // this component doesn't depend on any system
                  // module's action creators.
                  dispatch(refreshFromPeers());
                  void refresh();
                }}
              >
                Atualizar
              </Button>
            </Tooltip>
          </Box>
          <StatusRow label="Ambiente" value={status.workspaceName ?? "—"} />
          <StatusRow label="coId" value={status.workspaceCoId ?? "—"} mono />
          <StatusRow label="syncUrl" value={status.syncUrl ?? "—"} mono />
          <StatusRow
            label="syncOptIn"
            value={status.syncOptIn ? "true" : "false"}
          />
          <StatusRow
            label="Conta local"
            value={status.accountId ?? "—"}
            mono
          />
          <Box sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Peers ({status.peers.length})
            </Typography>
            {status.peers.length === 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.6 }}>
                Nenhum peer registrado no sync manager.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  fontFamily: "monospace",
                  fontSize: 12,
                  maxHeight: 160,
                  overflowY: "auto",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1,
                  px: 1,
                  py: 0.5,
                  mt: 0.5,
                }}
              >
                {status.peers.map((p) => (
                  <span key={p}>{p}</span>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      }
      actions={[]}
    >
      <Tooltip title={tooltipTitle}>
        <IconButton
          data-testid="peers-indicator"
          aria-label="peers-indicator"
          size="small"
        >
          <Badge
            badgeContent={status.peers.length}
            color={status.connected ? "success" : "default"}
            showZero
            data-testid="peers-indicator-badge"
            data-peers-connected={status.connected ? "true" : "false"}
            data-peers-count={String(status.peers.length)}
            sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 14, minWidth: 14 } }}
          >
            {status.connected ? (
              <CloudDoneSharpIcon
                fontSize="small"
                color="success"
              />
            ) : (
              <CloudOffSharpIcon
                fontSize="small"
                color={status.syncOptIn ? "error" : "disabled"}
              />
            )}
          </Badge>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

const StatusRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
    <Typography
      variant="caption"
      sx={{ minWidth: 90, color: "text.secondary" }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontFamily: mono ? "monospace" : undefined,
        wordBreak: "break-all",
      }}
    >
      {value}
    </Typography>
  </Box>
);

export default React.memo(PeersIndicator);
