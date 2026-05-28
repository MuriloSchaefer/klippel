import React from "react";
import { Box, IconButton, List, ListItem, Tooltip, Typography, useTheme } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { IMaterialsModule } from "@system/modules/Materials";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { type MaterialNode } from "../../../typings";
import { refreshMaterialSnapshots } from "../../../store/variations/actions";
import { MODULE_NAME } from "../../../constants";
import AddMaterialButton from "./AddMaterialButton";
import MaterialItem from "./components/MaterialItem";

function MaterialListAccordion({
  variationId,
}: Readonly<{
  variationId: string;
}>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;
  const dispatch = useAppDispatch();

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
  const materials = materialsModule.hooks.useMaterials();
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AddMaterialButton variationId={variationId} />
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ModelViewport/refreshMaterials`}
        >
          <Tooltip title="Atualizar informações dos materiais">
            <span>
              <IconButton
                id="composer-refresh-materials"
                aria-label="refresh-materials"
                data-testid="refresh-materials"
                size="small"
                disabled={!materials || materialNodes.length === 0}
                onClick={() =>
                  dispatch(refreshMaterialSnapshots({ variationId }))
                }
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </ShortcutHint>
      </Box>
      <List sx={{ p: 0, mt: 2 }}>
        {materialNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum material referenciado
            </Typography>
          </ListItem>
        ) : (
          materialNodes.map((node: MaterialNode) => {
            const material =
              node.materialSnapshot ?? materials?.[node.materialId];
            return (
              <MaterialItem
                variationId={variationId}
                key={node.id}
                node={node}
                material={material}
              />
            );
          })
        )}
      </List>
    </>
  );
}

export default React.memo(MaterialListAccordion);
