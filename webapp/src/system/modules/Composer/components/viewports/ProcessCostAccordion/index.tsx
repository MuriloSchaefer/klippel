import React from "react";
import { Box, Divider, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { IConverterModule } from "@system/modules/Converter";
import useVariationUnitCost from "../../../hooks/useVariationUnitCost";
import type { CostRow } from "../../../utils/variationUnitCost";

/**
 * Cost per produced unit: process labour, material consumption priced at each
 * material's `preco`, and logo application. All three groups are listed with
 * their own subtotal so the total is auditable — a garment quote that hides the
 * fabric, or the embroidery, is not a quote.
 */
function ProcessCostAccordion({
  variationId,
}: Readonly<{ variationId: string }>) {
  const theme = useTheme();

  const converterModule = useModule<IConverterModule>("Converter");
  const useUnits = converterModule.hooks.useUnits;

  const units = useUnits(["reais11", "unitario18", "minutos249"] as string[]);

  // Shared with Orders, which snapshots the same total onto a budget line.
  const cost = useVariationUnitCost(variationId);

  const moneyAbbr = units?.["reais11"]?.abbreviation || "R$";
  const unitAbbr = units?.["unitario18"]?.abbreviation || "un";

  const money = (value: number) => `${value.toFixed(2)} ${moneyAbbr}`;

  const renderRow = (kind: "process" | "material" | "logo") => (r: CostRow) => (
    <ListItem
      id={`${kind}-cost-accordion-item-${r.id}`}
      data-testid={`${kind}-cost-row`}
      data-cost-label={r.label}
      data-cost-money={r.moneyPerUnit !== undefined ? r.moneyPerUnit.toFixed(2) : ""}
      data-cost-disabled={r.disabledByElective ? "true" : undefined}
      key={r.id}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: "column",
        alignItems: "flex-start",
        p: 1,
        // Struck through, not hidden: the step still belongs to the variation,
        // it just is not being performed in this configuration.
        opacity: r.disabledByElective ? 0.6 : 1,
        textDecoration: r.disabledByElective ? "line-through" : "none",
      }}
      aria-label={`${
        kind === "process" ? "Processo" : kind === "material" ? "Material" : "Logo"
      } ${r.label}. Custo por unidade: ${
        r.moneyPerUnit !== undefined ? money(r.moneyPerUnit) : "não definido"
      }`}
    >
      <Box>
        <Typography id={`${kind}-cost-accordion-item-label-${r.id}`}>
          {r.label}
        </Typography>
        <Typography
          id={`${kind}-cost-accordion-item-cost-${r.id}`}
          variant="caption"
          color={theme.palette.text.secondary}
          aria-label={`Custo por unidade: ${
            r.moneyPerUnit !== undefined
              ? `${money(r.moneyPerUnit)} por ${unitAbbr}`
              : "não definido"
          }`}
        >
          {r.moneyPerUnit !== undefined ? (
            <>
              custo por unidade: {money(r.moneyPerUnit)} / {unitAbbr}
            </>
          ) : (
            // Say *why* it is unpriced — "não definido" alone sends the user
            // hunting through the material and the process alike.
            `custo por unidade: não definido${
              r.unpricedReason ? ` (${r.unpricedReason})` : ""
            }`
          )}
        </Typography>
      </Box>
    </ListItem>
  );

  const subtotal = (
    id: string,
    label: string,
    value: number,
  ) => (
    <ListItem
      id={id}
      data-testid={id}
      data-cost-money={value.toFixed(2)}
      sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
      aria-label={`${label}. Custo por unidade: ${money(value)}`}
    >
      <Typography variant="body2" color={theme.palette.text.secondary}>
        {label}
      </Typography>
      <Typography variant="body2" color={theme.palette.text.secondary}>
        {money(value)} / {unitAbbr}
      </Typography>
    </ListItem>
  );

  const isEmpty =
    cost.rows.length === 0 &&
    cost.materialRows.length === 0 &&
    cost.logoRows.length === 0;

  return (
    <List
      sx={{ p: 0, mt: 2 }}
      id="process-cost-accordion"
      data-cost-total={cost.totalMoneyPerUnit.toFixed(2)}
      aria-label="Lista de processos, materiais, logos e custo"
    >
      {isEmpty ? (
        <ListItem
          id="process-cost-accordion-empty"
          aria-label="Nenhum processo foi adicionado à variação"
        >
          <Typography color={theme.palette.text.secondary}>
            Nenhum processo adicionado
          </Typography>
        </ListItem>
      ) : null}

      {cost.rows.length > 0 ? (
        <>
          <ListItem sx={{ px: 1, pt: 1, pb: 0 }}>
            <Typography variant="overline" color={theme.palette.text.secondary}>
              Processos
            </Typography>
          </ListItem>
          {cost.rows.map(renderRow("process"))}
          {subtotal(
            "process-cost-accordion-subtotal",
            "Subtotal processos",
            cost.processMoneyPerUnit,
          )}
        </>
      ) : null}

      {cost.materialRows.length > 0 ? (
        <>
          <Divider component="li" />
          <ListItem sx={{ px: 1, pt: 1, pb: 0 }}>
            <Typography variant="overline" color={theme.palette.text.secondary}>
              Materiais
            </Typography>
          </ListItem>
          {cost.materialRows.map(renderRow("material"))}
          {subtotal(
            "material-cost-accordion-subtotal",
            "Subtotal materiais",
            cost.materialMoneyPerUnit,
          )}
        </>
      ) : null}

      {cost.logoRows.length > 0 ? (
        <>
          <Divider component="li" />
          <ListItem sx={{ px: 1, pt: 1, pb: 0 }}>
            <Typography variant="overline" color={theme.palette.text.secondary}>
              Logos
            </Typography>
          </ListItem>
          {cost.logoRows.map(renderRow("logo"))}
          {subtotal(
            "logo-cost-accordion-subtotal",
            "Subtotal logos",
            cost.logoMoneyPerUnit,
          )}
        </>
      ) : null}

      {!isEmpty ? (
        <ListItem
          id="process-cost-accordion-total"
          sx={{ display: "flex", justifyContent: "space-between", p: 1 }}
          aria-label={`Total. Custo por unidade: ${money(
            cost.totalMoneyPerUnit,
          )}`}
        >
          <Typography sx={{ fontWeight: 600 }}>Total</Typography>
          <Typography
            id="process-cost-accordion-total-cost"
            sx={{ fontWeight: 600 }}
            aria-label={`Custo total por unidade: ${money(
              cost.totalMoneyPerUnit,
            )} por ${unitAbbr}`}
          >
            custo por unidade: {money(cost.totalMoneyPerUnit)} / {unitAbbr}
          </Typography>
        </ListItem>
      ) : null}
    </List>
  );
}

export default React.memo(ProcessCostAccordion);
