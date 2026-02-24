import { List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IMaterialsModule } from "@system/modules/Materials";
import type { MaterialNode } from "../../../typings";
import AddMaterialButton from "./AddMaterialButton";
import MaterialItem from "./components/MaterialItem";

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
