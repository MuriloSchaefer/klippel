import { useCallback, useEffect, useRef, useState } from "react";
import { ListItem } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import { fallbackRender } from "@kernel/App";
import { useVariationActions } from "../../../../hooks/useVariationActions";
import type { MaterialNode } from "../../../../typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { Color } from "@system/modules/Materials/typings";
import ShowMaterial from "./ShowMaterial";
import EditMaterial from "./EditMaterial";

export default function MaterialItem({
  variationId,
  node,
  material,
}: {
  variationId: string;
  node: MaterialNode;
  material: MaterialState | undefined;
}) {
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const materialTypes = materialsModule.hooks.useMaterialTypes();
  const { actions } = useVariationActions({ variationId });
  const [isEditing, setIsEditing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const refocusAfterEditRef = useRef(false);
  const handleEdit = useCallback(() => setIsEditing(true), []);
  const handleDelete = useCallback(
    () => actions.removeMaterialNode(node.id),
    [actions, node.id],
  );

  useEffect(() => {
    if (!isEditing && refocusAfterEditRef.current) {
      refocusAfterEditRef.current = false;
      rowRef.current?.focus();
    }
  }, [isEditing]);

  const materialType = material ? materialTypes[material.type] : undefined;
  const schema = materialType?.schemas?.[material?.schemaVersion ?? ""];
  const selector = schema?.selector;
  const label = selector?.principal
    ? material?.attributes?.[selector.principal]
    : undefined;
  const extra = selector?.extra
    ? material?.attributes?.[selector.extra]
    : null;
  const colors = Object.entries(schema?.attributes ?? {}).find(
    ([, attrDef]) => attrDef === "color",
  );
  const color: Color | undefined = colors
    ? material?.attributes?.[colors[0]]
    : undefined;

  return (
    <ErrorBoundary fallbackRender={fallbackRender}>
      <ListItem
        key={node.id}
        id={node.id}
        ref={rowRef}
        data-testid="material-item"
        data-material-label={node.label}
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
          justifyContent: "space-around",
          p: 1,
          border: "2px solid transparent",
          borderRadius: 1,
          transition: "border-color 0.15s, box-shadow 0.15s",
          "&:focus, &:focus-visible, &:focus-within": {
            outline: "none",
            borderColor: "primary.main",
            boxShadow: (theme) => `0 0 0 2px ${theme.palette.primary.light}`,
          },
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
            isFocused={isFocused}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ) : (
          <EditMaterial
            type={material?.type ?? ""}
            typeRestrictions={node.typeRestrictions}
            materialId={node.materialId}
            onCancel={() => {
              refocusAfterEditRef.current = true;
              setIsEditing(false);
            }}
            onSave={(materialId) => {
              actions.updateMaterial(node.id, materialId);
              refocusAfterEditRef.current = true;
              setIsEditing(false);
            }}
          />
        )}
      </ListItem>
    </ErrorBoundary>
  );
}
