import { Box, Chip, IconButton, List, ListItem, Tooltip, Typography, useTheme } from "@mui/material";
import { FactCheckOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IConverterModule } from "@system/modules/Converter";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { ElectiveNode, GraduationNode, ProcessNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import ProcessTimeAuditContent from "./ProcessTimeAuditContent";

export default function ProcessTimeAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId);

  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;
  const units = useUnits(["minutos249", "unitario18"] as string[]);

  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer } = pointerModule.components;
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const nodes = graph?.state ? Object.values(graph.state.nodes) : [];
  const processNodes = nodes.filter(
    (n: any) => n.type === "PROCESS"
  ) as ProcessNode[];
  const graduationNodes = nodes.filter(
    (n: any) => n.type === "GRADUATION"
  ) as GraduationNode[];

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
            ? (graph?.state?.nodes[p.electiveNodeId] as ElectiveNode | undefined)
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
