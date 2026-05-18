import { Alert, Box } from "@mui/material";
import LockSharpIcon from "@mui/icons-material/LockSharp";
import type { LeaseStatus } from "../../../hooks/useEditLease";

/**
 * Surfaces when another peer holds the edit lease on this model so the
 * non-holder understands their edits will be rejected by the authoritative
 * `updateModelGraph` check until the lease expires or is released.
 */
export default function LeaseBanner({ status }: Readonly<{ status: LeaseStatus }>) {
  if (status.kind !== "held_by_other") return null;
  const holder = status.snapshot.holderAccountId;
  const expiresIn = Math.max(0, Math.round((status.snapshot.expiresAt - Date.now()) / 1000));
  return (
    <Box
      data-testid="composer-lease-banner"
      sx={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}
    >
      <Alert severity="warning" icon={<LockSharpIcon fontSize="small" />} variant="filled">
        Modelo em edição por {holder.slice(0, 12)}… — somente leitura (expira em {expiresIn}s)
      </Alert>
    </Box>
  );
}
