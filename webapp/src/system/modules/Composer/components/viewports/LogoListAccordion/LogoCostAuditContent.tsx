import { Box, Divider, Typography } from "@mui/material";
import type { LogoCostAudit } from "../../../typings";

export default function LogoCostAuditContent({
  audit,
}: Readonly<{ audit: LogoCostAudit | undefined }>) {
  if (!audit) {
    return (
      <Box data-testid="logo-cost-audit" sx={{ p: 2, minWidth: 280 }}>
        <Typography color="text.secondary">Sem auditoria de custo.</Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="logo-cost-audit" sx={{ p: 2, minWidth: 320 }}>
      <Typography variant="subtitle2">Auditoria de custo</Typography>
      <Typography variant="caption" color="text.secondary">
        methodFactor={audit.methodFactor} · gradesTotal={audit.gradesTotal}
      </Typography>
      <Divider sx={{ my: 1 }} />

      {audit.skipped ? (
        <Typography color="warning.main" data-testid="logo-cost-audit-skipped">
          {audit.skipReason ?? "Elétivo desabilitado — custo 0."}
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {audit.placements.map((p) => (
            <Box
              key={p.placementId}
              data-testid="logo-cost-audit-placement"
              data-placement-name={p.name}
              sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2">{p.name}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  {p.size.width.amount}×{p.size.height.amount} {p.size.width.unit}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  data-testid="logo-cost-audit-placement-expression"
                  sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
                >
                  {p.expression || "—"}
                </Typography>
              </Box>
              <Typography variant="body2">{p.cost.toFixed(2)}</Typography>
            </Box>
          ))}
          <Divider sx={{ my: 0.5 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2">Custo por unidade</Typography>
            <Typography variant="body2" data-testid="logo-cost-audit-total">
              {audit.total.toFixed(2)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="subtitle2">
              Total ({audit.gradesTotal} un.)
            </Typography>
            <Typography
              variant="subtitle2"
              data-testid="logo-cost-audit-garment-total"
            >
              {audit.garmentTotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
