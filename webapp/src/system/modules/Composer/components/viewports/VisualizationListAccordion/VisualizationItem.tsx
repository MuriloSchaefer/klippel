import { useEffect, useRef, useState } from "react";
import { Box, Chip, IconButton, ListItem, Typography, useTheme } from "@mui/material";
import { DeleteOutlineSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { IMaterialsModule } from "@system/modules/Materials";
import useVariation from "../../../hooks/useVariation";
import type {
  MaterialNode,
  VariationGraphState,
  VisualizationNode,
} from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import VisualizationEditButton from "./VisualizationEditButton";

export default function VisualizationItem({
  node,
  variationId,
}: {
  node: VisualizationNode;
  variationId: string;
}) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const graph = graphModule.hooks.useGraph<VariationGraphState>(variationId);
  const variation = useVariation({ variationId });

  const materialNode = graph?.state?.nodes?.[node.materialNodeId] as
    | MaterialNode
    | undefined;
  const materialId = materialNode?.materialId;
  const materials = materialsModule.hooks.useMaterials(
    materialId !== undefined ? [materialId] : [],
  );
  const material = materialId !== undefined ? materials?.[materialId] : undefined;
  const materialTypes = materialsModule.hooks.useMaterialTypes();
  const materialType = material ? materialTypes[material.type] : undefined;
  const schema =
    materialType && material
      ? materialType.schemas[material.schemaVersion]
      : undefined;
  const labelText = schema
    ? material?.attributes[schema.selector.principal]
    : undefined;
  const extra = schema?.selector?.extra
    ? material?.attributes[schema.selector.extra]
    : null;
  const colorEntry = Object.entries(schema?.attributes ?? {}).find(
    ([, attrDef]) => attrDef === "color",
  );
  const color = colorEntry
    ? (material?.attributes as any)?.[colorEntry[0]]
    : undefined;

  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const refocusAfterEditRef = useRef(false);

  // re-focus the row after edit pointer closes (the edit pointer manages its own focus internally)
  useEffect(() => {
    if (refocusAfterEditRef.current) {
      refocusAfterEditRef.current = false;
      rowRef.current?.focus();
    }
  });

  return (
    <ListItem
      ref={rowRef}
      id={node.id}
      data-testid="visualization-item"
      data-visualization-label={node.label}
      tabIndex={0}
      onFocus={(e) => {
        if (e.currentTarget === e.target) setIsFocused(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsFocused(false);
        }
      }}
      sx={{
        mb: 0.5,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        border: "2px solid transparent",
        borderRadius: 1,
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:focus, &:focus-visible, &:focus-within": {
          outline: "none",
          borderColor: "primary.main",
          boxShadow: (t) => `0 0 0 2px ${t.palette.primary.light}`,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography color="text.secondary">Material:</Typography>
          <Typography data-testid="visualization-item-material-label">
            {materialNode?.label ?? node.materialNodeId}
          </Typography>
          {material ? (
            <Chip
              size="small"
              label={
                typeof labelText === "object" && labelText && "label" in labelText
                  ? (labelText as any).label
                  : (labelText ?? extra ?? "")
              }
              sx={{ background: color?.hex ?? undefined }}
            />
          ) : null}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {Array.isArray(node.doms) && node.doms.length
            ? `Elementos: ${node.doms.map((d) => d.id).join(", ")}`
            : "Sem elementos selecionados"}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/VisualizationItem/deleteVisualization`}
          alwaysShow={isFocused}
        >
          <IconButton
            data-testid="visualization-item-delete"
            aria-label="delete-visualization"
            sx={{ "&:hover": { color: theme.palette.error.main } }}
            onClick={() => {
              const row = rowRef.current;
              const next =
                (row?.nextElementSibling as HTMLElement | null) ??
                (row?.previousElementSibling as HTMLElement | null) ??
                null;
              const fallback = document.getElementById(
                "composer-add-visualization",
              ) as HTMLElement | null;
              const target =
                next && next.matches('[data-testid="visualization-item"]')
                  ? next
                  : fallback;
              variation.actions.removeVisualization(node.id);
              if (target) {
                setTimeout(() => target.focus(), 0);
              }
            }}
          >
            <DeleteOutlineSharp color="error" />
          </IconButton>
        </ShortcutHint>
        <VisualizationEditButton
          node={node}
          variationId={variationId}
          isFocused={isFocused}
          onClose={() => {
            refocusAfterEditRef.current = true;
          }}
        />
      </Box>
    </ListItem>
  );
}
