import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { DeleteOutlineSharp, FactCheckOutlined, ModeEditOutlineSharp } from "@mui/icons-material";
import { ErrorBoundary } from "react-error-boundary";
import useModule from "@kernel/hooks/useModule";
import type { IConverterModule } from "@system/modules/Converter";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { MaterialNode } from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { Color } from "@system/modules/Materials/typings";
import { fallbackRenderLabelOnly } from "@kernel/App";
import MaterialCostInfo from "./MaterialCostInfo";
import MaterialCostAuditContent from "./MaterialCostAuditContent";

export default function ShowMaterial({
  label,
  materialLabel,
  extra,
  color,
  stock,
  onEdit,
  onDelete,
  variationId,
  node,
  material,
}: {
  label: string;
  materialLabel: string;
  extra: any;
  color?: Color;
  stock?: { amount: number; unit: string };
  onEdit: () => void;
  onDelete: () => void;
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
  const converterModule = useModule<IConverterModule>("Converter");
  const pointerModule = useModule<IPointerModule>("Pointer");
  const useUnits = converterModule.hooks.useUnits;
  
  const { PointerContainer } = pointerModule.components;

  const units = useUnits([material.stock?.unit].filter(Boolean) as string[]);

  const abbreviation = stock && units?.[stock.unit]?.abbreviation;

  return (
    <>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}
      >
        <Typography sx={{ fontWeight: 500, mr: 1 }} variant="body2">
          {label}
        </Typography>
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "row" }}>
          <Typography sx={{ fontWeight: 500, mr: 1 }} data-testid="material-principal">
            {materialLabel}
          </Typography>
          <Typography color={theme.palette.text.secondary} sx={{ ml: 1 }} data-testid="material-extra">
            (
            {typeof extra === "object" && "label" in extra
              ? extra.label
              : extra}
            )
          </Typography>
          {color ? (
            <Tooltip title={color.label} arrow>
              <span
                style={{
                  display: "inline-block",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: color.hex,
                  border: `1px solid ${theme.palette.divider}`,
                  marginLeft: 8,
                }}
              />
            </Tooltip>
          ) : null}
        </Box>
        {stock && (
          <Typography
            variant="caption"
            color={theme.palette.text.secondary}
            sx={{ ml: 0.5 }}
          >
            Em estoque: {stock.amount} {abbreviation || stock.unit}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography
            variant="caption"
            color={theme.palette.text.secondary}
            sx={{ ml: 0.5 }}
          >
            Custo por unidade:{" "}
            {
              <ErrorBoundary fallbackRender={fallbackRenderLabelOnly}>
                <MaterialCostInfo
                  variationId={variationId}
                  node={node}
                  material={material}
                />
              </ErrorBoundary>
            }
          </Typography>
          <PointerContainer
            component={
              <MaterialCostAuditContent
                variationId={variationId}
                node={node}
                material={material}
              />
            }
            actions={[]}
          >
            <Tooltip title="Ver detalhes da computação" arrow>
              <IconButton
                size="small"
                sx={{
                  padding: 0.25,
                  "&:hover": { color: theme.palette.primary.main },
                }}
              >
                <FactCheckOutlined sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </PointerContainer>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.error.light },
          }}
          onClick={onDelete}
        >
          <DeleteOutlineSharp color="error" />
        </IconButton>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.primary.main },
          }}
          onClick={onEdit}
        >
          <ModeEditOutlineSharp color="info" />
        </IconButton>
      </Box>
    </>
  );
}
