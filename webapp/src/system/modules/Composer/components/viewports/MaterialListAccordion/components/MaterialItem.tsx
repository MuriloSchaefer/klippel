import { useState } from "react";
import { ListItem } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import { fallbackRender } from "@kernel/App";
import useVariation from "../../../../hooks/useVariation";
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
        data-testid="material-item"
        data-material-label={node.label}
        tabIndex={0}
        sx={{
          mb: 0.5,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          p: 1,
          "&:focus-visible": { outline: "2px solid", outlineOffset: 2 },
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
            onDelete={() => variation.actions.removeMaterialNode(node.id)}
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
