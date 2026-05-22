import React from "react";
import { List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { IMaterialsModule } from "@system/modules/Materials";
import { type MaterialNode } from "../../../typings";
import AddMaterialButton from "./AddMaterialButton";
import MaterialItem from "./components/MaterialItem";

function MaterialListAccordion({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialNodes = useAppSelector(
    (s: any): MaterialNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is MaterialNode => n.type === "MATERIAL",
      );
    },
    shallowEqual,
  );

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

export default React.memo(MaterialListAccordion);
