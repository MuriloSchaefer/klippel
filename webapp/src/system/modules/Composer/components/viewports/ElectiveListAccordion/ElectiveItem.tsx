import { useEffect, useRef, useState } from "react";
import { Box, IconButton, ListItem, Switch, Typography, useTheme } from "@mui/material";
import { DeleteOutlineSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { ElectiveNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";
import ElectiveEditButton from "./ElectiveEditButton";

export default function ElectiveItem({
  node,
  variationId,
}: {
  node: ElectiveNode;
  variationId: string;
}) {
  const theme = useTheme();
  const { actions } = useVariationActions({ variationId });
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const [isFocused, setIsFocused] = useState(false);
  const rowRef = useRef<HTMLLIElement | null>(null);
  const refocusAfterEditRef = useRef(false);

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
      data-testid="elective-item"
      data-elective-label={node.label}
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
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}>
        <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
        <Typography color="text.secondary">
          (padrão: {node.defaultValue ? "sim" : "não"})
        </Typography>
        <Switch
          data-testid="elective-item-value"
          checked={!!node.value}
          onChange={(_, checked) =>
            actions.updateElective(node.id, { value: checked })
          }
          color="primary"
        />
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/ElectiveItem/deleteElective`}
          alwaysShow={isFocused}
        >
          <IconButton
            data-testid="elective-item-delete"
            aria-label="delete-elective"
            sx={{ "&:hover": { color: theme.palette.error.main } }}
            onClick={() => {
              const row = rowRef.current;
              const next =
                (row?.nextElementSibling as HTMLElement | null) ??
                (row?.previousElementSibling as HTMLElement | null) ??
                null;
              const fallback = document.getElementById(
                "composer-add-elective",
              ) as HTMLElement | null;
              const target =
                next && next.matches('[data-testid="elective-item"]')
                  ? next
                  : fallback;
              actions.removeElective(node.id);
              if (target) {
                setTimeout(() => target.focus(), 0);
              }
            }}
          >
            <DeleteOutlineSharp color="error" />
          </IconButton>
        </ShortcutHint>
        <ElectiveEditButton
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
