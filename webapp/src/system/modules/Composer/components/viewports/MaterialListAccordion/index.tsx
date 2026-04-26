import { List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IMaterialsModule } from "@system/modules/Materials";
import { VariationGraphState, type MaterialNode } from "../../../typings";
import AddMaterialButton from "./AddMaterialButton";
import MaterialItem from "./components/MaterialItem";
import { useMemo } from "react";

export default function MaterialListAccordion({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph<VariationGraphState>(variationId);
  const materialNodes = useMemo(()=>{
    return graph?.state
    ? (Object.values(graph.state.nodes).filter(
        (n): n is MaterialNode => n.type === "MATERIAL",
      ))
    : [];
  }, [graph.state])


  // Get materials module and hook
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const useMaterials = materialsModule.hooks.useMaterials;

  const materials = useMaterials();

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
                material={materials![node.materialId]}
              />
            );
          })
        )}
      </List>
    </>
  );
}
