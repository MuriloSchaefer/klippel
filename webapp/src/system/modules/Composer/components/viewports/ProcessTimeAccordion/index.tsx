import React from "react";
import { Box, Chip, IconButton, List, ListItem, Tooltip, Typography, useTheme } from "@mui/material";
import { FactCheckOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { IConverterModule } from "@system/modules/Converter";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { ElectiveNode, GraduationNode, ProcessNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import ProcessTimeAuditContent from "./ProcessTimeAuditContent";

function ProcessTimeAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  const units = useUnits(["minutos249", "unitario18"] as string[]);

  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer } = pointerModule.components;
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const processNodes = useAppSelector(
    (s: any): ProcessNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n) => n.type === "PROCESS",
      ) as ProcessNode[];
    },
    shallowEqual,
  );

  const graduationNodes = useAppSelector(
    (s: any): GraduationNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n) => n.type === "GRADUATION",
      ) as GraduationNode[];
    },
    shallowEqual,
  );

  const electiveMap = useAppSelector(
    (s: any): Record<string, ElectiveNode> => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return {};
      const result: Record<string, ElectiveNode> = {};
      for (const n of Object.values(nodes) as any[]) {
        if (n.type === "ELECTIVE") result[n.id] = n as ElectiveNode;
      }
      return result;
    },
    shallowEqual,
  );

  /**
   * No elective gate here on purpose: `computeProcessTime` already returns no
   * time for a process whose elective is off, so a suppressed step contributes
   * `?? 0` and its row reads "tempo não definido". Re-checking the elective in
   * this sum would duplicate a decision that belongs to the computation, and
   * would quietly disagree with it if the two ever drifted.
   */
  const totalMinutesPerUnit = processNodes.reduce(
    (sum, p) => sum + (p.computedTimePerUnit?.amount ?? 0),
    0
  );
  const totalGarments = graduationNodes.reduce(
    (sum, g) => sum + (g.amount ?? 0),
    0
  );
  const totalMinutesAllGrades = totalMinutesPerUnit * totalGarments;

  const minAbbr = units?.["minutos249"]?.abbreviation || "min";
  const unitAbbr = units?.["unitario18"]?.abbreviation || "un";

  return (
    <List
      sx={{ p: 0, mt: 2 }}
      id="process-time-accordion"
      data-testid="process-time-accordion"
      // Numeric mirrors of the three figures this accordion derives, so a test
      // asserts them as selectors instead of parsing the rendered caption
      // (e2e-tests.md §2).
      data-time-minutes-per-unit={totalMinutesPerUnit.toFixed(2)}
      data-time-garments={totalGarments}
      data-time-total-minutes={totalMinutesAllGrades.toFixed(2)}
      aria-label="Lista de processos e tempo"
      tabIndex={-1}
    >
      {processNodes.length === 0 ? (
        <ListItem
          id="process-time-accordion-empty"
          aria-label="Nenhum processo foi adicionado à variação"
        >
          <Typography color={theme.palette.text.secondary}>
            Nenhum processo adicionado
          </Typography>
        </ListItem>
      ) : (
        processNodes.map((p) => {
          const minutesPerUnit = p.computedTimePerUnit?.amount;
          const elective = p.electiveNodeId
            ? electiveMap[p.electiveNodeId]
            : undefined;
          // A row is only "computed" when the cached computedTimePerUnit was
          // derived from the *current* costTime. The debounced middleware
          // takes ~300ms to rerun on edits; without this check, the row
          // briefly advertises stale numbers as fresh.
          const currentCostTimeHash = p.costTime ? JSON.stringify(p.costTime) : "";
          const isFresh =
            minutesPerUnit !== undefined &&
            p.computedTimeFromCostTimeHash === currentCostTimeHash;
          return (
            <ListItem
              id={`process-time-accordion-item-${p.id}`}
              key={p.id}
              data-testid="process-time-item"
              data-process-id={p.id}
              data-process-label={p.label}
              data-process-time-status={isFresh ? "computed" : "pending"}
              // Mirrors the figure the row renders, so a test asserts the number
              // rather than parsing the caption (e2e-tests.md §2). Empty while it
              // is still `pending`, matching what the row shows.
              data-process-minutes={
                minutesPerUnit !== undefined ? minutesPerUnit.toFixed(2) : ""
              }
              tabIndex={0}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                outline: "none",
                "&:focus-visible": {
                  boxShadow: (t) => `0 0 0 2px ${t.palette.primary.main}`,
                  borderRadius: 1,
                },
              }}
              aria-label={`Processo ${p.label}. Tempo por unidade: ${
                minutesPerUnit !== undefined
                  ? `${minutesPerUnit.toFixed(2)} ${minAbbr}`
                  : "não definido"
              }`}
            >
              <Box sx={{ flexGrow: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography id={`process-time-accordion-item-label-${p.id}`}>
                    {p.label}
                  </Typography>
                  {elective && (
                    <Chip
                      data-testid="process-time-accordion-item-elective"
                      label={elective.label}
                      size="small"
                      color={elective.value ? "success" : "default"}
                      sx={{ height: 20 }}
                    />
                  )}
                </Box>
                <Typography
                  id={`process-time-accordion-item-time-${p.id}`}
                  variant="caption"
                  color={theme.palette.text.secondary}
                  aria-label={`Tempo por unidade: ${
                    minutesPerUnit !== undefined
                      ? `${minutesPerUnit.toFixed(2)} ${minAbbr} por ${unitAbbr}`
                      : "não definido"
                  }`}
                >
                  {minutesPerUnit !== undefined ? (
                    <>
                      tempo por unidade: {minutesPerUnit.toFixed(2)} {minAbbr} /{" "}
                      {unitAbbr}
                    </>
                  ) : (
                    "tempo não definido"
                  )}
                </Typography>
              </Box>
              <PointerContainer
                component={<ProcessTimeAuditContent node={p} />}
                actions={[]}
              >
                <Tooltip title="Ver detalhes da computação de tempo" arrow>
                  <IconButton
                    id={`process-time-accordion-item-audit-${p.id}`}
                    data-testid="process-time-audit-log"
                    aria-label="open-process-time-audit-log"
                    size="small"
                    sx={{
                      padding: 0.25,
                      "&:hover": { color: theme.palette.primary.main },
                    }}
                  >
                    <ShortcutHint
                      placement="top-right"
                      shortcutId={`${MODULE_NAME}/ProcessTimeItem/openAudit`}
                    >
                      <FactCheckOutlined sx={{ fontSize: 16 }} />
                    </ShortcutHint>
                  </IconButton>
                </Tooltip>
              </PointerContainer>
            </ListItem>
          );
        })
      )}
      {processNodes.length > 0 ? (
        <ListItem
          id="process-time-accordion-total"
          sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
          aria-label={`Total para ${totalGarments} ${unitAbbr}: ${totalMinutesAllGrades.toFixed(
            2
          )} ${minAbbr}`}
        >
          <Typography sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography
            id="process-time-accordion-total-time"
            sx={{ fontWeight: 600 }}
            aria-label={`Tempo total considerando todas as graduações: ${totalMinutesAllGrades.toFixed(
              2
            )} ${minAbbr} para ${totalGarments} ${unitAbbr}`}
          >
            {totalMinutesAllGrades.toFixed(2)} {minAbbr} ({totalGarments}{" "}
            {unitAbbr})
          </Typography>
        </ListItem>
      ) : null}
    </List>
  );
}

export default React.memo(ProcessTimeAccordion);
