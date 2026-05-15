import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import { useMemo } from "react";
import { IConverterModule } from "@system/modules/Converter";
import { ProcessNode } from "../../../typings";

export default function ProcessCostAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId);

  const converterModule = useModule<IConverterModule>("Converter");
  const converter = converterModule.hooks.useConverter();
  const useUnits = converterModule.hooks.useUnits;

  const processNodes: ProcessNode[] = graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n: any) => n.type === "PROCESS"
      ) as ProcessNode[])
    : [];

  const units = useUnits(["reais11", "unitario18", "minutos249"] as string[]);

  const perProcessAndTotal = useMemo(() => {
    let totalMoneyPerUnit = 0;
    const rows = processNodes.map((p) => {
      let moneyPerUnit: number | undefined = undefined;
      const minutesPerUnit = p.computedTimePerUnit?.amount;
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

          if (moneyPerUnit === undefined && minutesPerUnit !== undefined) {
            const perMinute = converter.convert(p.costMoney, {
              quotient: "reais11",
              dividend: "minutos249",
            });
            if (perMinute) {
              if ("quotient" in perMinute) {
                const q = perMinute.quotient.amount;
                const d = perMinute.dividend.amount || 1;
                moneyPerUnit = (q / d) * minutesPerUnit;
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

      return { id: p.id, label: p.label, moneyPerUnit };
    });

    return { rows, totalMoneyPerUnit };
  }, [processNodes, converter]);

  const moneyAbbr = units?.["reais11"]?.abbreviation || "R$";
  const unitAbbr = units?.["unitario18"]?.abbreviation || "un";

  return (
    <List
      sx={{ p: 0, mt: 2 }}
      id="process-cost-accordion"
      aria-label="Lista de processos e custo"
    >
      {perProcessAndTotal.rows.length === 0 ? (
        <ListItem
          id="process-cost-accordion-empty"
          aria-label="Nenhum processo foi adicionado à variação"
        >
          <Typography color={theme.palette.text.secondary}>
            Nenhum processo adicionado
          </Typography>
        </ListItem>
      ) : (
        perProcessAndTotal.rows.map((r) => (
          <ListItem
            id={`process-cost-accordion-item-${r.id}`}
            key={r.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "column",
              p: 1,
            }}
            aria-label={`Processo ${r.label}. Custo por unidade: ${
              r.moneyPerUnit !== undefined
                ? `${r.moneyPerUnit.toFixed(2)} ${moneyAbbr}`
                : "não definido"
            }`}
          >
            <Box>
              <Typography id={`process-cost-accordion-item-label-${r.id}`}>
                {r.label}
              </Typography>
              <Typography
                id={`process-cost-accordion-item-cost-${r.id}`}
                variant="caption"
                color={theme.palette.text.secondary}
                aria-label={`Custo por unidade: ${
                  r.moneyPerUnit !== undefined
                    ? `${r.moneyPerUnit.toFixed(2)} ${moneyAbbr} por ${unitAbbr}`
                    : "não definido"
                }`}
              >
                {r.moneyPerUnit !== undefined ? (
                  <>
                    custo por unidade: {r.moneyPerUnit.toFixed(2)} {moneyAbbr} /{" "}
                    {unitAbbr}
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
          id="process-cost-accordion-total"
          sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
          aria-label={`Total. Custo por unidade: ${perProcessAndTotal.totalMoneyPerUnit.toFixed(
            2
          )} ${moneyAbbr}`}
        >
          <Typography sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography
            id="process-cost-accordion-total-cost"
            sx={{ fontWeight: 600 }}
            aria-label={`Custo total por unidade: ${perProcessAndTotal.totalMoneyPerUnit.toFixed(
              2
            )} ${moneyAbbr} por ${unitAbbr}`}
          >
            custo por unidade: {perProcessAndTotal.totalMoneyPerUnit.toFixed(2)}{" "}
            {moneyAbbr} / {unitAbbr}
          </Typography>
        </ListItem>
      ) : null}
    </List>
  );
}
