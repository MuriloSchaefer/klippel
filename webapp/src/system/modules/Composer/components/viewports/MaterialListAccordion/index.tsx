import { useTheme, List, ListItem, Typography } from "@mui/material";
import AddMaterialButton from "./AddMaterialButton";
import Tooltip from "@mui/material/Tooltip";
import type { MaterialNode } from "../../../typings";
import type { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import type { IMaterialsModule } from "@system/modules/Materials";
import useMaterialTypes from "@system/modules/Materials/hooks/useMaterialTypes";
import type { Color } from "@system/modules/Materials/typings";

export default function MaterialListAccordion({
  variationId,
}: {
  variationId: string;
}) {
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
    .filter((id) => !isNaN(id));
  const materials = useMaterials(materialIds);

  // Get material types
  const materialTypes = useMaterialTypes();

  return (
    <>
      <AddMaterialButton
        variationId={variationId}
        onSelect={(materialId) => {
          /* TODO: handle add material to graph */
        }}
      />
      <List sx={{ p: 0, mt: 2 }}>
        {materialNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum material referenciado
            </Typography>
          </ListItem>
        ) : (
          materialNodes.map((node: MaterialNode) => {
            const material = materials[node.materialId];
            // Find material type and schema
            const materialType = materialTypes[material?.type];
            const schema = materialType?.schemas?.[material?.schemaVersion];
            const label = material?.attributes[schema.selector.principal];
            const extra = schema.selector.extra
              ? material?.attributes[schema.selector.extra]
              : null;
            // Find color attribute name in schema
            let colors = Object.entries(schema?.attributes ?? {}).find(([attrName, attrDef]) => attrDef === "color")
            const color: Color | undefined = colors ? material?.attributes[colors[0]] : undefined;
            return (
              <ListItem
                key={node.id}
                sx={{
                  mb: 0.5,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  p: 0,
                }}
              >
                <Typography sx={{ fontWeight: 500, mr: 1 }}>{label}</Typography>
                <Typography color={theme.palette.text.secondary} sx={{ ml: 1 }}>
                  ({"label" in extra ? extra.label : extra})
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
              </ListItem>
            );
          })
        )}
      </List>
    </>
  );
}
