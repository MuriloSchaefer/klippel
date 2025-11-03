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
import type { MaterialNode } from "../../../typings";
import type { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import type { Color } from "@system/modules/Materials/typings";
import {
  CancelSharp,
  DeleteOutlineSharp,
  ModeEditOutlineSharp,
  SaveSharp,
} from "@mui/icons-material";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { useState } from "react";
import useVariation from "../../../hooks/useVariation";

function ShowMaterial({
  label,
  extra,
  color,
  onEdit,
  onDelete,
}: {
  label: string;
  extra: any;
  color?: Color;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "row" }}>
        <Typography sx={{ fontWeight: 500, mr: 1 }}>{label}</Typography>
        <Typography color={theme.palette.text.secondary} sx={{ ml: 1 }}>
          ({typeof extra === "object" && "label" in extra ? extra.label : extra}
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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.error.main },
          }}
          onClick={onDelete}
        >
          <DeleteOutlineSharp />
        </IconButton>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.primary.main },
          }}
          onClick={onEdit}
        >
          <ModeEditOutlineSharp />
        </IconButton>
      </Box>
    </>
  );
}

function EditMaterial({
  type,
  materialId,
  onSave,
  onCancel,
}: {
  type: string;
  materialId: number;
  onSave: (materialId: number) => void;
  onCancel: () => void;
}) {
  const theme = useTheme();
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const { MaterialSelector } = materialsModule.components;

  const [form, setForm] = useState({ materialId });
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
          <Typography sx={{ fontWeight: 500, mr: 1, width: "100%" }}>
            Tipo: {type}
          </Typography>
          <MaterialSelector
            type={type}
            value={form.materialId}
            onChange={(newId) => setForm({ materialId: newId })}
          />
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <IconButton
          sx={{
            "&:hover": { color: theme.palette.success.main },
          }}
          onClick={() => onSave(form.materialId)}
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
          label={label}
          extra={extra}
          color={color}
          onEdit={() => setIsEditing(true)}
          onDelete={() => variation.actions.removeMaterial(node.materialId)}
        />
      ) : (
        <EditMaterial
          type={material.type}
          materialId={node.materialId}
          onCancel={() => setIsEditing(false)}
          onSave={(materialId) => {
            variation.actions.updateMaterial(node.id, materialId);
            setIsEditing(false);
          }}
        />
      )}
    </ListItem>
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
