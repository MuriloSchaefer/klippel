import { Alert, Box } from "@mui/material";
import LockSharpIcon from "@mui/icons-material/LockSharp";
import { useEffect, useState } from "react";
import type { LeaseStatus } from "../../../hooks/useEditLease";

/**
 * Surfaces when another peer holds the edit lease on this model so the
 * non-holder understands their edits will be rejected by the authoritative
 * `updateModelGraph` check until the lease expires or is released.
 *
 * The countdown ticks via a local 1s interval — `status` only changes
 * when the holder, acquiredAt, or expiresAt mutate, which is much rarer
 * than once per second.
 */
export default function LeaseBanner({ status }: Readonly<{ status: LeaseStatus }>) {
  // Hook order must be stable across renders; `useState`/`useEffect` cannot
  // sit behind the `kind !== 'held_by_other'` early return.
  const [now, setNow] = useState(() => Date.now());
  const showing = status.kind === "held_by_other";
  useEffect(() => {
    if (!showing) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [showing]);

  if (!showing) return null;
  const holder = status.snapshot.holderAccountId;
  const expiresIn = Math.max(0, Math.round((status.snapshot.expiresAt - now) / 1000));
  return (
    <Box
      data-testid="composer-lease-banner"
      data-lease-holder={holder}
      sx={{ position: "absolute", top: 8, left: "50%", transform: "translate(-110%, 0%)", zIndex: 10 }}
    >
      <Alert severity="warning" icon={<LockSharpIcon fontSize="small" />} variant="filled">
        Modelo em edição por {holder.slice(0, 12)}… — somente leitura (expira em {expiresIn}s)
      </Alert>
    </Box>
  );
}
