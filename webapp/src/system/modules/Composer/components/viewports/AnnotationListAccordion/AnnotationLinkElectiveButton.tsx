import { useEffect, useState } from "react";
import { Box, IconButton, MenuItem, Select, Typography } from "@mui/material";
import { HowToVoteSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { IPointerModule } from "@kernel/modules/Pointer";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../hooks/useVariationActions";
import type { AnnotationNode, ElectiveNode } from "../../../typings";
import { MODULE_NAME } from "../../../constants";

function AnnotationLinkElectiveButton({
  node,
  variationId,
  isFocused,
}: Readonly<{ node: AnnotationNode; variationId: string; isFocused: boolean }>) {
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

  const [pendingElectiveId, setPendingElectiveId] = useState(
    node.electiveNodeId ?? "",
  );
  useEffect(() => {
    setPendingElectiveId(node.electiveNodeId ?? "");
  }, [node.electiveNodeId]);

  return (
    <PointerContainer
      onClose={() => setPendingElectiveId(node.electiveNodeId ?? "")}
      component={
        <Box data-testid="annotation-link-elective" sx={{ p: 2, minWidth: 260 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Vincular eletivo
          </Typography>
          <Select
            size="small"
            fullWidth
            value={pendingElectiveId}
            data-testid="annotation-link-elective-select"
            onChange={(e) => setPendingElectiveId(e.target.value as string)}
            displayEmpty
          >
            <MenuItem value="">Nenhum</MenuItem>
            {electives.map((el) => (
              <MenuItem
                key={el.id}
                value={el.id}
                data-testid={`annotation-link-elective-option-${el.label}`}
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
          data-testid="annotation-link-elective-confirm"
          handleConfirm={() =>
            actions.linkAnnotationElective(node.id, pendingElectiveId)
          }
        />,
      ]}
    >
      <IconButton
        data-testid="annotation-item-link-elective"
        aria-label="annotation-link-elective"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/AnnotationItem/linkElective`}
          alwaysShow={isFocused}
        >
          <HowToVoteSharp />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}

export default AnnotationLinkElectiveButton;
