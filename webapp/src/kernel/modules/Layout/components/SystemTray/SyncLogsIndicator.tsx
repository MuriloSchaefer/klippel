import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Box,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import ReceiptLongSharpIcon from "@mui/icons-material/ReceiptLongSharp";
import PauseCircleSharpIcon from "@mui/icons-material/PauseCircleSharp";
import PlayCircleSharpIcon from "@mui/icons-material/PlayCircleSharp";
import DeleteSweepSharpIcon from "@mui/icons-material/DeleteSweepSharp";
import ContentCopySharpIcon from "@mui/icons-material/ContentCopySharp";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import { useSyncLogs, type SyncLogEntry } from "../../hooks/useSyncLogs";

/**
 * System-tray indicator for cojson sync events. Opens a panel
 * streaming the latest entries from the main-process ring buffer.
 *
 * The IPC subscription is established on mount (via the `useSyncLogs`
 * hook) and torn down on unmount. The IconButton's badge shows the
 * count of entries received since the panel was last opened; opening
 * the panel resets the counter.
 */
const SyncLogsIndicator: React.FC = () => {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer } = pointerModule.components;

  // Subscribe to the IPC channel for the lifetime of this component,
  // not just while the panel is open. The badge needs to track new
  // entries arriving in the background; the panel just renders the
  // already-streaming list.
  const { entries, paused, setPaused, clear, copyAll } = useSyncLogs(true);

  // Last entry id the user "saw". The panel content only mounts
  // when the PointerContainer is open (see `PointerContainer.tsx`
  // — `ModalContent` is rendered conditionally), so we use a
  // mount effect on the panel to reset this watermark. Re-arms on
  // panel unmount so the next unseen burst is counted from "now".
  const [seenWatermark, setSeenWatermark] = useState(0);
  const lastEntryId = entries.length > 0 ? entries[entries.length - 1].id : 0;
  const unseen = Math.max(0, lastEntryId - seenWatermark);

  const markSeen = () => setSeenWatermark(lastEntryId);

  return (
    <PointerContainer
      component={
        <SyncLogsPanel
          entries={entries}
          paused={paused}
          setPaused={setPaused}
          clear={clear}
          copyAll={copyAll}
          onMount={markSeen}
        />
      }
      actions={[]}
    >
      <Tooltip title="Eventos de sincronização">
        <IconButton
          data-testid="sync-logs-indicator"
          aria-label="sync-logs-indicator"
          size="small"
        >
          <Badge
            badgeContent={unseen}
            color="primary"
            invisible={unseen === 0}
            data-testid="sync-logs-indicator-badge"
            data-unseen-count={String(unseen)}
            sx={{ "& .MuiBadge-badge": { fontSize: 10, height: 14, minWidth: 14 } }}
          >
            <ReceiptLongSharpIcon fontSize="small" color="primary" />
          </Badge>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
};

const LEVEL_COLOR: Record<SyncLogEntry["level"], string> = {
  debug: "text.disabled",
  info: "text.primary",
  warn: "warning.main",
  error: "error.main",
};

interface PanelProps {
  entries: SyncLogEntry[];
  paused: boolean;
  setPaused: (paused: boolean) => void;
  clear: () => void;
  copyAll: () => Promise<void>;
  onMount: () => void;
}

const SyncLogsPanel: React.FC<PanelProps> = ({
  entries,
  paused,
  setPaused,
  clear,
  copyAll,
  onMount,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  // PointerContainer only mounts the panel's `component` when the
  // user opens it. Use that as the "panel was opened" signal —
  // clears the unseen-count badge owned by the indicator.
  useEffect(() => {
    onMount();
    // `onMount` is a fresh closure each render but should only fire
    // on the genuine mount. Intentionally narrow the dep list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Autoscroll while not paused. Skip the scroll on the initial
  // snapshot if it's already at the bottom (no-op).
  useEffect(() => {
    if (paused) return;
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [entries, paused]);

  const rows = useMemo(() => entries.slice(-500), [entries]);

  return (
    <Box
      data-testid="sync-logs-panel"
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        padding: 1.5,
        width: 520,
        maxWidth: "80vw",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          justifyContent: "space-between",
        }}
      >
        <Typography variant="overline" color="text.secondary">
          Sync logs ({rows.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25 }}>
          <Tooltip title={paused ? "Retomar" : "Pausar"}>
            <IconButton
              size="small"
              data-testid="sync-logs-toggle-pause"
              onClick={() => setPaused(!paused)}
            >
              {paused ? (
                <PlayCircleSharpIcon fontSize="small" />
              ) : (
                <PauseCircleSharpIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Limpar">
            <IconButton size="small" data-testid="sync-logs-clear" onClick={clear}>
              <DeleteSweepSharpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Copiar tudo">
            <IconButton
              size="small"
              data-testid="sync-logs-copy"
              onClick={() => void copyAll()}
            >
              <ContentCopySharpIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Box
        ref={listRef}
        sx={{
          fontFamily: "monospace",
          fontSize: 11,
          lineHeight: 1.35,
          maxHeight: "55vh",
          overflowY: "auto",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          px: 1,
          py: 0.5,
          bgcolor: "action.hover",
        }}
      >
        {rows.length === 0 ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontFamily: "inherit" }}
          >
            Sem eventos. Ative o nível DEBUG com KLIPPEL_JAZZ_DEBUG=1
            para ver tráfego de sincronização.
          </Typography>
        ) : (
          rows.map((entry) => (
            <Box
              key={entry.id}
              data-testid="sync-logs-row"
              data-sync-log-level={entry.level}
              sx={{
                display: "grid",
                gridTemplateColumns: "60px 52px 1fr",
                gap: 0.5,
                color: LEVEL_COLOR[entry.level],
              }}
            >
              <span style={{ color: "rgba(0,0,0,0.5)" }}>
                {new Date(entry.ts).toISOString().slice(11, 23)}
              </span>
              <span>{entry.level.toUpperCase()}</span>
              <span style={{ wordBreak: "break-word" }}>{entry.message}</span>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};

export default React.memo(SyncLogsIndicator);
