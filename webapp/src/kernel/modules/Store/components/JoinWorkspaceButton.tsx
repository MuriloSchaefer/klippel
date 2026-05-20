import {
  Box,
  FormControl,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import GroupAddIcon from "@mui/icons-material/GroupAdd";
import useModule from "@kernel/hooks/useModule";
import { IPointerModule } from "@kernel/modules/Pointer";
import { useCallback, useState } from "react";
import { useAppDispatch } from "../hooks";
import { joinWorkspace } from "../actions";

// Same resolution order as ShareWorkspaceButton — the harness pins
// `KLIPPEL_JAZZ_SYNC_URL` per run so both peers prefill the right server.
const DEFAULT_SYNC_URL =
  (globalThis as unknown as {
    electron?: { env?: { KLIPPEL_JAZZ_SYNC_URL?: string } };
  }).electron?.env?.KLIPPEL_JAZZ_SYNC_URL ||
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_JAZZ_SYNC_URL ||
  "ws://127.0.0.1:4242";

/**
 * Parse a `klippel://join?coId=…&syncUrl=…` invite. Returns `null` if the
 * string is not a recognized invite; callers fall back to treating each
 * field independently. Pasting either the full URI or a bare coId works.
 */
function parseInvite(raw: string): { coId?: string; syncUrl?: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("klippel://")) return null;
  try {
    const url = new URL(trimmed);
    return {
      coId: url.searchParams.get("coId") ?? undefined,
      syncUrl: url.searchParams.get("syncUrl") ?? undefined,
    };
  } catch {
    return null;
  }
}

function defaultName(coId: string): string {
  const short = coId.replace(/^co_/, "").slice(0, 6);
  return short ? `joined-${short}` : "";
}

export function JoinWorkspaceButton() {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;

  const [coId, setCoId] = useState("");
  const [syncUrl, setSyncUrl] = useState(DEFAULT_SYNC_URL);
  const [name, setName] = useState("");

  const dispatch = useAppDispatch();

  // Paste handler attached to every field — if the user pastes a full
  // invite URI into any input, populate every field at once.
  const onPaste = useCallback((event: React.ClipboardEvent<HTMLFormElement>) => {
    const text = event.clipboardData.getData("text");
    const invite = parseInvite(text);
    if (!invite) return;
    event.preventDefault();
    if (invite.coId) {
      setCoId(invite.coId);
      if (!name) setName(defaultName(invite.coId));
    }
    if (invite.syncUrl) setSyncUrl(invite.syncUrl);
  }, [name]);

  const handleJoin = useCallback(() => {
    if (!coId || !syncUrl || !name) return;
    dispatch(joinWorkspace({ name, coId, syncUrl }));
  }, [coId, syncUrl, name, dispatch]);

  const disabled = !coId || !syncUrl || !name;

  return (
    <PointerContainer
      component={
        <Box
          component={"form"}
          data-testid="join-workspace-panel"
          sx={{ display: "flex", flexDirection: "column", gap: 1, padding: 2, minWidth: 360 }}
          onPaste={onPaste}
        >
          <Typography sx={{ padding: 1, width: "100%", textAlign: "center" }}>
            Entrar em um ambiente compartilhado
          </Typography>
          <FormControl>
            <TextField
              label="coId"
              variant="standard"
              value={coId}
              onChange={(e) => {
                setCoId(e.target.value);
                if (!name) setName(defaultName(e.target.value));
              }}
              error={!coId}
              data-testid="join-workspace-coid"
            />
          </FormControl>
          <FormControl>
            <TextField
              label="Servidor de sincronização"
              variant="standard"
              value={syncUrl}
              onChange={(e) => setSyncUrl(e.target.value)}
              error={!syncUrl}
              data-testid="join-workspace-sync-url"
            />
          </FormControl>
          <FormControl>
            <TextField
              label="Nome local"
              variant="standard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!name}
              data-testid="join-workspace-name"
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          color="success"
          key="join"
          value="Entrar"
          handleConfirm={handleJoin}
          disabled={disabled}
          data-testid="join-workspace-submit"
        />,
      ]}
    >
      <Tooltip title="Entrar em um ambiente compartilhado">
        <IconButton data-testid="join-workspace-button">
          <GroupAddIcon />
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
}
