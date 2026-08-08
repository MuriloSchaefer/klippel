import { useAppDispatch, useAppSelector } from "../hooks";
import { selectModuleState } from "../selectors";
import type { StoreState } from "../state";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import { useState } from "react";
import { pauseSessionAutoSaver, resumeSessionAutoSaver } from "../actions";
import {
  Box,
  Button,
  ClickAwayListener,
  IconButton,
  List,
  ListItem,
  Popover,
  Typography,
} from "@mui/material";
import useStorage from "../hooks/useStorage";

function SessionAutoSaverIcon({ interval }: Readonly<{ interval?: number }>) {
  const dispatch = useAppDispatch();
  const storage = useStorage();

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setShowPopover((v) => !v);
  };
  // Set, don't toggle: `onClose` and the ClickAwayListener can both fire for
  // one dismissal, and two toggles would reopen the popover.
  const handleClose = () => {
    setAnchorEl(null);
    setShowPopover(false);
  };

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

  const [showPopover, setShowPopover] = useState(false);
  // Surfaced as `data-session-saved-at` so a caller (and e2e) can tell that the
  // snapshot finished landing on disk, not merely that the click happened.
  const [savedAt, setSavedAt] = useState<number | undefined>();
  const [saving, setSaving] = useState(false);
  return (
    <>
      <IconButton
        size="small"
        component="span"
        aria-label="session-autosaver"
        data-testid="session-autosaver"
        onClick={handleClick}
      >
        <SaveSharpIcon color="primary" />
      </IconButton>

      <Popover
        open={showPopover}
        anchorEl={anchorEl}
        // Without this the popover could not be dismissed with Escape at all.
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
      >
        <ClickAwayListener onClickAway={handleClose}>
          <Box
            data-testid="session-autosaver-panel"
            data-session-saved-at={savedAt}
            data-session-saving={saving}
            sx={{ padding: 5, alignContent: "center" }}
          >
            {interval ? (
              <Typography>
                Salvamento de sessão automático a cada{" "}
                <b>{interval} segundos</b>
              </Typography>
            ) : (
              <Typography color="gray">
                Salvamento de sessão desligada
              </Typography>
            )}
            <List>
              <ListItem
                sx={{ display: "flex", gap: 3, justifyContent: "center" }}
              >
                <Button
                  color="primary"
                  id="save-session-now"
                  data-testid="save-session-now"
                  aria-label="save-session-now"
                  disabled={saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await storage.saveSession();
                      setSavedAt(Date.now());
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  Salvar agora
                </Button>
                <Button
                  color="secondary"
                  onClick={() => dispatch(pauseSessionAutoSaver())}
                >
                  Pausar
                </Button>
              </ListItem>
              <ListItem>
                Alterar intervalo:{" "}
                <Button
                  onClick={() =>
                    dispatch(resumeSessionAutoSaver({ interval: 30 }))
                  }
                >
                  30s
                </Button>
                <Button
                  onClick={() =>
                    dispatch(resumeSessionAutoSaver({ interval: 60 }))
                  }
                >
                  60s
                </Button>
                <Button
                  onClick={() =>
                    dispatch(resumeSessionAutoSaver({ interval: 60 * 5 }))
                  }
                >
                  5m
                </Button>
              </ListItem>
            </List>
          </Box>
        </ClickAwayListener>
      </Popover>
    </>
  );
}

export default function SessionAutoSaverIconLoader() {
  const interval = useAppSelector(
    selectModuleState("Store", (s: StoreState) => s.sessionAutoSaveInterval)
  );

  return <SessionAutoSaverIcon interval={interval} />;
}
