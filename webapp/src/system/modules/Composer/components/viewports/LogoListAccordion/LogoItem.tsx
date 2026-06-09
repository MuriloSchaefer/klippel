import React, { useRef, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  ListItem,
  Typography,
  useTheme,
} from "@mui/material";
import { DeleteOutlineSharp, ReceiptLongOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { IPointerModule } from "@kernel/modules/Pointer";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { LogoNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import LogoCostAuditContent from "./LogoCostAuditContent";
import LogoEditButton from "./LogoEditButton";
import LogoLinkElectiveButton from "./LogoLinkElectiveButton";
import LogoPlacementsButton from "./LogoPlacementsButton";

function LogoItem({
  node,
  variationId,
}: Readonly<{ node: LogoNode; variationId: string }>) {
  const theme = useTheme();
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { PointerContainer } = pointerModule.components;
  const { actions } = useVariationActions({ variationId });

  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);

  const cost = node.computedCost?.quotient.amount ?? 0;
  const firstSize = node.placements[0]?.size ?? node.defaultSize;

  return (
    <ListItem
      ref={rowRef}
      id={node.id}
      data-testid="logo-item"
      data-logo-label={node.label}
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
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
        border: "2px solid transparent",
        borderRadius: 1,
        "&:focus, &:focus-visible, &:focus-within": {
          outline: "none",
          borderColor: "primary.main",
          boxShadow: (t) => `0 0 0 2px ${t.palette.primary.light}`,
        },
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          <Chip size="small" label={node.method === "embroidery" ? "Bordado" : "Silk"} />
          <Chip size="small" label={`${node.colors} cores`} />
          <Chip
            size="small"
            label={`${firstSize.width.amount}×${firstSize.height.amount} ${firstSize.width.unit}`}
          />
          {node.source.kind === "raster" && node.source.pendingVector ? (
            <Chip
              size="small"
              color="warning"
              label="SVG pendente"
              data-testid="logo-item-pending-vector"
            />
          ) : null}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary" data-testid="logo-item-cost">
            Custo: {cost.toFixed(2)} ({node.placements.length} posições)
          </Typography>
          {/* Cost audit — kept next to the cost it explains */}
          <PointerContainer
            component={<LogoCostAuditContent audit={node.costAudit} />}
            actions={[]}
          >
            <IconButton
              data-testid="logo-item-audit-log"
              aria-label="logo-audit"
              size="small"
              sx={{
                padding: 0.25,
                "&:hover": { color: theme.palette.primary.main },
              }}
            >
              <ShortcutHint
                placement="top-center"
                shortcutId={`${MODULE_NAME}/LogoItem/openAudit`}
                alwaysShow={isFocused}
              >
                <ReceiptLongOutlined sx={{ fontSize: 16 }} />
              </ShortcutHint>
            </IconButton>
          </PointerContainer>
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {/* Delete */}
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/LogoItem/deleteLogo`}
          alwaysShow={isFocused}
        >
          <IconButton
            data-testid="logo-item-delete"
            aria-label="delete-logo"
            sx={{ "&:hover": { color: theme.palette.error.main } }}
            onClick={() => {
              const row = rowRef.current;
              const next =
                (row?.nextElementSibling as HTMLElement | null) ??
                (row?.previousElementSibling as HTMLElement | null) ??
                null;
              const fallback = document.getElementById(
                "composer-add-logo",
              ) as HTMLElement | null;
              const target =
                next && next.matches('[data-testid="logo-item"]')
                  ? next
                  : fallback;
              actions.removeLogo(node.id);
              if (target) setTimeout(() => target.focus(), 0);
            }}
          >
            <DeleteOutlineSharp color="error" />
          </IconButton>
        </ShortcutHint>


        {/* Edit */}
        <LogoEditButton
          node={node}
          variationId={variationId}
          isFocused={isFocused}
        />

        {/* Link elective */}
        <LogoLinkElectiveButton
          node={node}
          variationId={variationId}
          isFocused={isFocused}
        />

        {/* Placements */}
        <LogoPlacementsButton
          node={node}
          variationId={variationId}
          isFocused={isFocused}
        />

      </Box>
    </ListItem>
  );
}

export default React.memo(LogoItem);
