import { useEffect, useState } from "react";
import { Box, IconButton, MenuItem, Select, Typography } from "@mui/material";
import { HowToVoteSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { IPointerModule } from "@kernel/modules/Pointer";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { ElectiveNode, LogoNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";

// Split out of LogoItem so the pending-selection state stays local: typing in
// the picker re-renders only this button, not the whole logo row.
function LogoLinkElectiveButton({
  node,
  variationId,
  isFocused,
}: Readonly<{ node: LogoNode; variationId: string; isFocused: boolean }>) {
  const storeModule = useModule<Store>("Store");
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { useAppSelector } = storeModule.hooks;
  const { actions } = useVariationActions({ variationId });

  const electives = useAppSelector(
    (s: any): ElectiveNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is ElectiveNode => n.type === "ELECTIVE",
      );
    },
    shallowEqual,
  );

  // Held locally so a picked elective is only persisted on confirm; reset to the
  // persisted value when the panel is closed without confirming.
  const [pendingElectiveId, setPendingElectiveId] = useState(
    node.electiveNodeId ?? "",
  );
  // Keep the picker in sync once a confirm is persisted (or the link changes
  // elsewhere). The discard-on-cancel reset lives in the container's onClose.
  useEffect(() => {
    setPendingElectiveId(node.electiveNodeId ?? "");
  }, [node.electiveNodeId]);

  return (
    <PointerContainer
      onClose={() => setPendingElectiveId(node.electiveNodeId ?? "")}
      component={
        <Box data-testid="logo-link-elective" sx={{ p: 2, minWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Vincular eletivo
          </Typography>
          <Select
            size="small"
            fullWidth
            value={pendingElectiveId}
            data-testid="logo-link-elective-select"
            onChange={(e) => setPendingElectiveId(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value="">Nenhum</MenuItem>
            {electives.map((el) => (
              <MenuItem
                key={el.id}
                value={el.id}
                data-testid={`logo-link-elective-option-${el.label}`}
              >
                {el.label}
              </MenuItem>
            ))}
          </Select>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="logo-link-elective-confirm"
          handleConfirm={() =>
            actions.linkLogoElective(node.id, pendingElectiveId)
          }
        />,
      ]}
    >
      <IconButton
        data-testid="logo-item-link-elective"
        aria-label="logo-link-elective"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/LogoItem/linkElective`}
          alwaysShow={isFocused}
        >
          <HowToVoteSharp />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}

export default LogoLinkElectiveButton;
