import {
  useTheme,
  List,
  ListItem,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import AddMaterialButton from "./AddMaterialButton";
import Tooltip from "@mui/material/Tooltip";
import type { ConsumesEdge, MaterialNode, ProcessNode } from "../../../typings";
import type { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import { IConverterModule } from "@system/modules/Converter";
import type { Color } from "@system/modules/Materials/typings";
import {
  CancelSharp,
  DeleteOutlineSharp,
  ModeEditOutlineSharp,
  SaveSharp,
} from "@mui/icons-material";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useMemo, useState } from "react";
import useVariation from "../../../hooks/useVariation";
import { CompoundValue, UnitValue } from "@system/modules/Converter/typings";
import { ErrorBoundary } from "react-error-boundary";
import { fallbackRender, fallbackRenderLabelOnly } from "@kernel/App";

function ShowMaterial({
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
  const useConverter = converterModule.hooks.useConverter;
  const useUnits = converterModule.hooks.useUnits;
  const graphModule = useModule<IGraphModule>("Graph");

  const units = useUnits([material.stock?.unit].filter(Boolean) as string[]);

  const abbreviation = stock && units && units[stock.unit]?.abbreviation;

  return (
    <>
      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 1, width: "100%" }}
      >
        <Typography sx={{ fontWeight: 500, mr: 1 }} variant="body2">
          {label}
        </Typography>
        <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "row" }}>
          <Typography sx={{ fontWeight: 500, mr: 1 }}>
            {materialLabel}
          </Typography>
          <Typography color={theme.palette.text.secondary} sx={{ ml: 1 }}>
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

function EditMaterial({
  type,
  typeRestrictions,
  materialId,
  onSave,
  onCancel,
}: Readonly<{
  type: string;
  typeRestrictions: string[];
  materialId: number;
  onSave: (materialId: number) => void;
  onCancel: () => void;
}>) {
  const theme = useTheme();
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const { MaterialSelector, MaterialTypeSelector } = materialsModule.components;

  const [form, setForm] = useState<{
    type: string;
    materialId: number | undefined;
  }>({ materialId, type });
  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <MaterialTypeSelector
            value={form.type}
            filter={(type) => {
              return typeRestrictions.includes(type.name);
            }}
            onChange={(e) =>
              setForm((curr) => ({
                ...curr,
                type: e.target.value,
                materialId: undefined,
              }))
            }
          />
          <MaterialSelector
            type={form.type}
            value={form.materialId}
            onChange={(newId) =>
              setForm((curr) => ({ ...curr, materialId: newId }))
            }
          />
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.success.main },
          }}
          onClick={() => {
            if (!form.materialId) {
              throw Error("must select a material");
            }
            onSave(form.materialId);
          }}
        >
          <SaveSharp />
        </IconButton>
        <IconButton
          onClick={onCancel}
          sx={{
            "&:hover": { color: theme.palette.error.main },
          }}
        >
          <CancelSharp />
        </IconButton>
      </Box>
    </>
  );
}

function MaterialCostInfo({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const theme = useTheme();
  const converterModule = useModule<IConverterModule>("Converter");
  const useConverter = converterModule.hooks.useConverter;
  const useUnits = converterModule.hooks.useUnits;
  const converter = useConverter();
  const graphModule = useModule<IGraphModule>("Graph");
  const graph = graphModule.hooks.useGraph(variationId, (g) => g);

  const cost = useMemo(() => {
    if (!material || !converter || !material.stock) {
      return undefined;
    }

    const consumesEdges = Object.values(graph.state?.edges ?? {}).filter(
      (e): e is ConsumesEdge => e.type === "CONSUMES" && e.targetId === node.id
    );
    let totalCost: CompoundValue = {
      quotient: { amount: 0, unit: material.stock.unit },
      dividend: { amount: 1, unit: "unitario18" },
    };
    for (const edge of consumesEdges) {
      const n = graph.state?.nodes[edge.sourceId];
      const processConsumption = converter.convert(
        edge.amount,
        {
          quotient: totalCost.quotient.unit,
          dividend: totalCost.dividend.unit,
        },
        material.attributes
      ) as UnitValue;
      if (!processConsumption) continue;
      totalCost.quotient.amount += processConsumption.amount;
    }

    return totalCost;
  }, [variationId, node, material, graph, converter]);

  const units = useUnits(
    [material.stock?.unit, cost?.quotient.unit, cost?.dividend.unit].filter(
      Boolean
    ) as string[]
  );

  const costAbbreviation =
    cost && units && units[cost.quotient.unit]?.abbreviation;
  const dividendAbbreviation =
    cost && units && units[cost.dividend.unit]?.abbreviation;

  return cost ? (
    <Typography
      variant="caption"
      color={theme.palette.text.secondary}
      sx={{ ml: 0.5 }}
    >
      {cost.quotient.amount.toFixed(2)} {costAbbreviation || cost.quotient.unit}{" "}
      / {dividendAbbreviation || cost.dividend.unit}
    </Typography>
  ) : (
    <Typography
      variant="caption"
      color={theme.palette.text.secondary}
      sx={{ ml: 0.5 }}
    >
      não utilizado
    </Typography>
  );
}

function MaterialItem({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState;
}) {
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const materialTypes = materialsModule.hooks.useMaterialTypes();
  const variation = useVariation({ variationId });
  const [isEditing, setIsEditing] = useState(false);

  // Find material type and schema
  const materialType = materialTypes[material?.type];
  const schema = materialType?.schemas?.[material?.schemaVersion];
  const label = material?.attributes[schema.selector.principal];
  const extra = schema.selector.extra
    ? material?.attributes[schema.selector.extra]
    : null;
  // Find color attribute name in schema
  let colors = Object.entries(schema?.attributes ?? {}).find(
    ([attrName, attrDef]) => attrDef === "color"
  );
  const color: Color | undefined = colors
    ? material?.attributes[colors[0]]
    : undefined;

  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <ListItem
        key={node.id}
        id={node.id}
        sx={{
          mb: 0.5,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          p: 1,
        }}
      >
        {!isEditing ? (
          <ShowMaterial
            label={node.label}
            materialLabel={label}
            extra={extra}
            color={color}
            stock={material?.stock}
            variationId={variationId}
            node={node}
            material={material}
            onEdit={() => setIsEditing(true)}
            onDelete={() => variation.actions.removeMaterial(node.materialId)}
          />
        ) : (
          <EditMaterial
            type={material.type}
            typeRestrictions={node.typeRestrictions}
            materialId={node.materialId}
            onCancel={() => setIsEditing(false)}
            onSave={(materialId) => {
              variation.actions.updateMaterial(node.id, materialId);
              setIsEditing(false);
            }}
          />
        )}
      </ListItem>
    </ErrorBoundary>
  );
}

export default function MaterialListAccordion({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);
  const materialNodes: MaterialNode[] = graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n: any) => n.type === "MATERIAL"
      ) as MaterialNode[])
    : [];

  // Get materials module and hook
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const useMaterials = materialsModule.hooks.useMaterials;
  // Get all material IDs referenced in the graph
  const materialIds = materialNodes
    .map((node) => Number(node.materialId))
    .filter((id) => !Number.isNaN(id));
  const materials = useMaterials(materialIds);

  return (
    <>
      <AddMaterialButton variationId={variationId} />
      <List sx={{ p: 0, mt: 2 }}>
        {materialNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum material referenciado
            </Typography>
          </ListItem>
        ) : (
          materialNodes.map((node: MaterialNode) => {
            return (
              <MaterialItem
                variationId={variationId}
                key={node.id}
                node={node}
                material={materials[node.materialId]}
              />
            );
          })
        )}
      </List>
    </>
  );
}
