import React from "react";
import { Box, List, ListItem, Typography, useTheme } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type { LogoNode } from "../../../typings";
import AddLogoButton from "./AddLogoButton";
import LogoItem from "./LogoItem";

function LogoListAccordion({
  variationId,
  garmentId = "garment",
}: Readonly<{ variationId: string; garmentId?: string }>) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const logoNodes = useAppSelector(
    (s: any): LogoNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is LogoNode => n.type === "LOGO",
      );
    },
    shallowEqual,
  );

  return (
    <Box data-testid="logo-list">
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddLogoButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {logoNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhum logo
            </Typography>
          </ListItem>
        ) : (
          logoNodes.map((node) => (
            <LogoItem key={node.id} node={node} variationId={variationId} />
          ))
        )}
      </List>
    </Box>
  );
}

export default React.memo(LogoListAccordion);
