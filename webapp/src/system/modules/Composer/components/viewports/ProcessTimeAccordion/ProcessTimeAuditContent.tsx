import { useState } from "react";
import { Box, Button, Divider, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { ProcessNode } from "../../../typings";

export default function ProcessTimeAuditContent({
  node,
}: {
  node: ProcessNode;
}) {
  const theme = useTheme();
  const [showFullError, setShowFullError] = useState(false);
  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  const converter = converterModule.hooks.useConverter();

  const audit = node.timeAudit;
  const scaledResult = audit?.result
    ? converterModule.utils.formatScaledResult(converter?.state, audit.result)
    : undefined;

  // Pull all units/compounds: useGraph's memoized selector keeps the first
  // result for a given graph reference, so passing dynamic node-id subsets
  // after first render returns an empty map. Reading all and resolving locally
  // sidesteps that.
  const units = useUnits();
  const abbr = (u: string | undefined) =>
    (u && units?.[u]?.abbreviation) || u || "";

  return (
    <Box
      data-testid="process-time-audit"
      data-process-audit-label={node.label}
      sx={{
        minWidth: 360,
        maxWidth: 560,
        maxHeight: "70vh",
        overflowY: "auto",
        userSelect: "text",
        cursor: "text",
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
    >
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Auditoria de Tempo - {node.label}
      </Typography>

      {!audit ? (
        <Typography color={theme.palette.text.secondary}>
          Tempo não computado para este processo.
        </Typography>
      ) : (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Custo de tempo bruto:{" "}
            {audit.rawCostTime ? (
              <>
                {audit.rawCostTime.quotient.amount}{" "}
                {abbr(audit.rawCostTime.quotient.unit)} /{" "}
                {audit.rawCostTime.dividend.amount}{" "}
                {abbr(audit.rawCostTime.dividend.unit)}
              </>
            ) : (
              "—"
            )}
          </Typography>

          {audit.attributeNormalisations.length > 0 && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: theme.palette.warning.main + "10",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, mb: 1, color: theme.palette.warning.main }}
              >
                ⚠ Normalizações de atributos
              </Typography>
              {audit.attributeNormalisations.map((an, i) => (
                <Typography
                  key={i}
                  variant="caption"
                  sx={{
                    display: "block",
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                  }}
                >
                  <strong>{an.attributeName}</strong>: {an.originalValue}{" "}
                  {abbr(an.originalUnit)} → {an.normalisedValue.toFixed(4)}{" "}
                  {abbr(an.normalisedUnit)}
                </Typography>
              ))}
            </Box>
          )}

          {audit.initialContext && Object.keys(audit.initialContext).length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Contexto inicial:
              </Typography>
              <Box
                sx={{
                  p: 1,
                  bgcolor: theme.palette.background.paper,
                  borderRadius: 0.5,
                }}
              >
                {Object.entries(audit.initialContext).map(([k, v]) => (
                  <Typography
                    key={k}
                    variant="caption"
                    sx={{
                      display: "block",
                      fontFamily: "monospace",
                      fontSize: "0.7rem",
                    }}
                  >
                    <strong>{k}</strong> = {v}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}

          {audit.plannedSteps && audit.plannedSteps.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Conversões planejadas:
              </Typography>
              {audit.plannedSteps.map((step, i) => {
                const executed = i < audit.conversionSteps.length;
                return (
                  <Box
                    key={i}
                    sx={{
                      mb: 1,
                      p: 1,
                      bgcolor: theme.palette.background.paper,
                      borderRadius: 0.5,
                      opacity: executed ? 1 : 0.7,
                      borderLeft: `3px solid ${
                        executed
                          ? theme.palette.success.main
                          : theme.palette.warning.main
                      }`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ display: "block", fontWeight: 500 }}
                    >
                      {i + 1}. {abbr(step.fromUnit)} → {abbr(step.toUnit)}{" "}
                      {executed ? "(executado)" : "(não executado)"}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        fontFamily: "monospace",
                        fontSize: "0.7rem",
                      }}
                    >
                      Expressão: {step.expression}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}

          {audit.conversionSteps.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Passos de conversão executados:
              </Typography>
              {audit.conversionSteps.map((step, i) => (
                <Box
                  key={i}
                  sx={{
                    mb: 1,
                    p: 1,
                    bgcolor: theme.palette.background.paper,
                    borderRadius: 0.5,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ display: "block", fontWeight: 500 }}
                  >
                    {i + 1}. {abbr(step.fromUnit)} → {abbr(step.toUnit)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontFamily: "monospace",
                      fontSize: "0.7rem",
                    }}
                  >
                    Expressão: {step.expression}
                  </Typography>
                  {Object.keys(step.quantityValues).length > 0 && (
                    <Typography variant="caption" sx={{ display: "block" }}>
                      <strong>Valores:</strong>{" "}
                      {Object.entries(step.quantityValues)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(", ")}
                    </Typography>
                  )}
                  {Object.keys(step.attributeValues).length > 0 && (
                    <Typography
                      variant="caption"
                      sx={{ display: "block", color: theme.palette.info.main }}
                    >
                      <strong>Atributos:</strong>{" "}
                      {Object.entries(step.attributeValues)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(", ")}
                    </Typography>
                  )}
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: theme.palette.success.main,
                      fontWeight: 500,
                    }}
                  >
                    Resultado: {step.result.toFixed(4)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {audit.fallback && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: theme.palette.warning.main + "10",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: theme.palette.warning.main }}
              >
                ⚠ Fallback aplicado
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                Motivo: {audit.fallback.reason}
              </Typography>
              <Typography variant="caption" sx={{ display: "block" }}>
                quociente={audit.fallback.rawQuotientAmount}, dividendo=
                {audit.fallback.rawDividendAmount} →{" "}
                {audit.fallback.resultMinutesPerUnit.toFixed(4)}
                {audit.result ? ` ${abbr(audit.result.unit)}` : ""}
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {audit.error ? (
            <Box
              data-testid="process-time-audit-error"
              sx={{
                p: 2,
                bgcolor: theme.palette.error.main + "15",
                borderRadius: 1,
                border: `1px solid ${theme.palette.error.main}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 600, color: theme.palette.error.main, mb: 1 }}
              >
                ✖ Falha no cálculo
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                {showFullError
                  ? audit.error
                  : audit.error.length > 120
                  ? `${audit.error.slice(0, 120)}…`
                  : audit.error}
              </Typography>
              {audit.error.length > 120 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  data-testid="process-time-audit-toggle-error"
                  onClick={() => setShowFullError((s) => !s)}
                >
                  {showFullError ? "Esconder erro completo" : "Mostrar erro completo"}
                </Button>
              )}
              <Typography
                variant="caption"
                sx={{ display: "block", color: theme.palette.text.secondary, mt: 1 }}
              >
                Tentativa em {new Date(audit.computedAt).toLocaleString()}.
              </Typography>
            </Box>
          ) : audit.result ? (
            <Box
              sx={{
                p: 2,
                bgcolor: theme.palette.primary.main + "15",
                borderRadius: 1,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                Tempo por unidade:
              </Typography>
              <Typography
                variant="body1"
                sx={{ fontWeight: 600, color: theme.palette.primary.main }}
              >
                {scaledResult?.amount.toFixed(3)} {scaledResult?.abbreviation}
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: "block", color: theme.palette.text.secondary }}
              >
                Computado em {new Date(audit.computedAt).toLocaleString()}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="caption"
              sx={{ display: "block", color: theme.palette.text.secondary }}
            >
              Sem resultado. Tentativa em {new Date(audit.computedAt).toLocaleString()}.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
