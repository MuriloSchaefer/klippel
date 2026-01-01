import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import { useMemo } from "react";
import { IConverterModule } from "@system/modules/Converter";
import useVariation from "../../../hooks/useVariation";
import { ProcessNode } from "../../../typings";

export default function ProcessTimeAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g) => g);

  const converterModule = useModule<IConverterModule>("Converter");
  const converter = converterModule.hooks.useConverter();
  const useUnits = converterModule.hooks.useUnits;

  const variation = useVariation({ variationId });

  const processNodes: ProcessNode[] = graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n: any) => n.type === "PROCESS"
      ) as ProcessNode[])
    : [];

  const units = useUnits(["minutos249", "unitario18", "reais11"] as string[]);

  const perProcessAndTotal = useMemo(() => {
    let totalMinutesPerUnit = 0;
    let totalMoneyPerUnit = 0;
    const rows = processNodes.map((p) => {
      let minutesPerUnit: number | undefined = undefined;
      let moneyPerUnit: number | undefined = undefined;
      try {
        if (converter && p.costTime) {
          const converted = converter.convert(p.costTime, {
            quotient: "minutos249",
            dividend: "unitario18",
          });
          if (converted) {
            if ("quotient" in converted) {
              // CompoundValue
              const q = converted.quotient.amount;
              const d = converted.dividend.amount || 1;
              minutesPerUnit = q / d;
            } else if ("amount" in converted) {
              // UnitValue -> assume per unit
              minutesPerUnit = converted.amount;
            }
          }
        }
      } catch (e) {
        console.warn("conversion failed", e);
      }

      // fallback: if dividend is already minutes-like, use raw amount
      if (minutesPerUnit === undefined && p.costTime?.dividend) {
        if (p.costTime.dividend.unit === "minutos249") {
          minutesPerUnit =
            p.costTime.dividend.amount / (p.costTime.quotient?.amount || 1);
        }
      }

      if (minutesPerUnit) totalMinutesPerUnit += minutesPerUnit;

      // money per unit: first try to convert directly to money/unit
      try {
        if (converter && p.costMoney) {
          const perUnit = converter.convert(p.costMoney, {
            quotient: "reais11",
            dividend: "unitario18",
          });
          if (perUnit) {
            if ("quotient" in perUnit) {
              const q = perUnit.quotient.amount;
              const d = perUnit.dividend.amount || 1;
              moneyPerUnit = q / d;
            } else if ("amount" in perUnit) {
              moneyPerUnit = perUnit.amount;
            }
          }

          // if not directly per unit, but we have minutesPerUnit, try money per minute and multiply
          if (moneyPerUnit === undefined && minutesPerUnit !== undefined) {
            const perMinute = converter.convert(p.costMoney, {
              quotient: "reais11",
              dividend: "minutos249",
            });
            if (perMinute) {
              if ("quotient" in perMinute) {
                const q = perMinute.quotient.amount;
                const d = perMinute.dividend.amount || 1;
                const reaisPerMinute = q / d;
                moneyPerUnit = reaisPerMinute * minutesPerUnit;
              } else if ("amount" in perMinute) {
                moneyPerUnit = perMinute.amount * minutesPerUnit;
              }
            }
          }
        }
      } catch (e) {
        console.warn("money conversion failed", e);
      }

      if (moneyPerUnit) totalMoneyPerUnit += moneyPerUnit;

      return { id: p.id, label: p.label, minutesPerUnit, moneyPerUnit };
    });

    return { rows, totalMinutesPerUnit, totalMoneyPerUnit };
  }, [processNodes, converter]);

  return (
    <>
      <List
        sx={{ p: 0, mt: 2 }}
        id="process-time-accordion"
        aria-label="Lista de processos e tempo"
      >
        {perProcessAndTotal.rows.length === 0 ? (
          <ListItem
            id="process-time-accordion-empty"
            aria-label="Nenhum processo foi adicionado à variação"
          >
            <Typography color={theme.palette.text.secondary}>
              Nenhum processo adicionado
            </Typography>
          </ListItem>
        ) : (
          perProcessAndTotal.rows.map((r) => (
            <ListItem
              id={`process-time-accordion-item-${r.id}`}
              key={r.id}
              sx={{ display: "flex", justifyContent: "space-between", flexDirection: 'column', p: 1 }}
              aria-label={`Processo ${r.label}. Tempo por unidade: ${
                r.minutesPerUnit !== undefined
                  ? `${r.minutesPerUnit.toFixed(2)} ${
                      units?.["minutos249"]?.abbreviation || "min"
                    }`
                  : "não definido"
              }. Custo por unidade: ${
                r.moneyPerUnit !== undefined
                  ? `${r.moneyPerUnit.toFixed(2)} ${
                      units?.["reais11"]?.abbreviation || "R$"
                    }`
                  : "Custo por unidade: não definido"
              }`}
            >
              <Box>
                <Typography
                  id={`process-time-accordion-item-label-${r.id}`}
                //   sx={{ fontWeight: 500 }}
                >
                  {r.label}
                </Typography>
                <Typography
                  id={`process-time-accordion-item-time-${r.id}`}
                  variant="caption"
                  color={theme.palette.text.secondary}
                  aria-label={`Tempo por unidade: ${
                    r.minutesPerUnit !== undefined
                      ? `${r.minutesPerUnit.toFixed(2)} ${
                          units?.["minutos249"]?.abbreviation || "min"
                        } por ${units?.["unitario18"]?.abbreviation || "un"}`
                      : "não definido"
                  }`}
                >
                  {r.minutesPerUnit !== undefined ? (
                    <>
                      tempo por unidade: {r.minutesPerUnit.toFixed(2)}{" "}
                      {units?.["minutos249"]?.abbreviation || "min"} /{" "}
                      {units?.["unitario18"]?.abbreviation || "un"}
                    </>
                  ) : (
                    "tempo não definido"
                  )}
                </Typography>
                <Typography
                  id={`process-time-accordion-item-cost-${r.id}`}
                  variant="caption"
                  color={theme.palette.text.secondary}
                  aria-label={`Custo por unidade: ${
                    r.moneyPerUnit !== undefined
                      ? `${r.moneyPerUnit.toFixed(2)} ${
                          units?.["reais11"]?.abbreviation || "R$"
                        } por ${units?.["unitario18"]?.abbreviation || "un"}`
                      : "não definido"
                  }`}
                >
                  {r.moneyPerUnit !== undefined ? (
                    <>
                      custo por unidade: {r.moneyPerUnit.toFixed(2)}{" "}
                      {units?.["reais11"]?.abbreviation || "R$"} /{" "}
                      {units?.["unitario18"]?.abbreviation || "un"}
                    </>
                  ) : (
                    "custo por unidade: não definido"
                  )}
                </Typography>
              </Box>
            </ListItem>
          ))
        )}
        {perProcessAndTotal.rows.length > 0 ? (
          <ListItem
            id="process-time-accordion-total"
            sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
            aria-label={`Total. Tempo por unidade: ${perProcessAndTotal.totalMinutesPerUnit.toFixed(
              2
            )} ${
              units?.["minutos249"]?.abbreviation || "min"
            }. Custo por unidade: ${perProcessAndTotal.totalMoneyPerUnit.toFixed(
              2
            )} ${units?.["reais11"]?.abbreviation || "R$"}`}
          >
            <Typography sx={{ fontWeight: 600 }}>Total</Typography>
            <Box
              sx={{
                textAlign: "right",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              <Typography
                id="process-time-accordion-total-time"
                sx={{ fontWeight: 600 }}
                aria-label={`Tempo total por unidade: ${perProcessAndTotal.totalMinutesPerUnit.toFixed(
                  2
                )} ${units?.["minutos249"]?.abbreviation || "min"} por ${
                  units?.["unitario18"]?.abbreviation || "un"
                }`}
              >
                tempo por unidade:{" "}
                {perProcessAndTotal.totalMinutesPerUnit.toFixed(2)}{" "}
                {units?.["minutos249"]?.abbreviation || "min"} /{" "}
                {units?.["unitario18"]?.abbreviation || "un"}
              </Typography>
              <Typography
                id="process-time-accordion-total-cost"
                sx={{ fontWeight: 600 }}
                aria-label={`Custo total por unidade: ${perProcessAndTotal.totalMoneyPerUnit.toFixed(
                  2
                )} ${units?.["reais11"]?.abbreviation || "R$"} por ${
                  units?.["unitario18"]?.abbreviation || "un"
                }`}
              >
                custo por unidade:{" "}
                {perProcessAndTotal.totalMoneyPerUnit.toFixed(2)}{" "}
                {units?.["reais11"]?.abbreviation || "R$"} /{" "}
                {units?.["unitario18"]?.abbreviation || "un"}
              </Typography>
            </Box>
          </ListItem>
        ) : null}
      </List>
    </>
  );
}
