import { useState, useCallback } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  IconButton,
  Tooltip,
} from "@mui/material";
import { HowToVoteSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";
import type { ProcessNode, ElectiveNode } from "../../../typings";

export default function ProcessElectiveButton({
  variationId,
  processNode,
  isFocused,
  onClose,
}: {
  variationId: string;
  processNode: ProcessNode;
  isFocused?: boolean;
  onClose?: () => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const storeModule = useModule<Store>("Store");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const { actions } = useVariationActions({ variationId });

  const [selectedElectiveId, setSelectedElectiveId] = useState<string | undefined>(
    processNode.electiveNodeId
  );

  const electiveNodes = useAppSelector(
    (s: any): ElectiveNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return Object.values(nodes).filter(
        (n: any): n is ElectiveNode => n.type === "ELECTIVE",
      );
    },
    shallowEqual,
  );

  const currentElective = useAppSelector(
    (s: any): ElectiveNode | null =>
      processNode.electiveNodeId
        ? (s.Graph?.graphs?.[variationId]?.nodes?.[processNode.electiveNodeId] as ElectiveNode) ?? null
        : null,
  );

  const handleConfirm = useCallback(() => {
    actions.updateProcess(processNode.id, {
      electiveNodeId: selectedElectiveId || undefined,
    });
  }, [selectedElectiveId, processNode.id, actions]);

  const tooltipTitle = currentElective
    ? `Vinculado ao eletivo "${currentElective.label}" (${currentElective.value ? "ativo" : "inativo"})`
    : "Vincular a eletivo";

  return (
    <PointerContainer
      onClose={() => onClose?.()}
      component={
        <Box
          data-testid="link-elective-form"
          sx={{ minWidth: 320, padding: 2 }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Vincular Eletivo ao Processo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Processos vinculados a eletivos só são considerados no cálculo de
            custo quando o eletivo está ativo (valor = verdadeiro).
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>Eletivo</InputLabel>
            <Select
              data-testid="link-elective-select"
              value={selectedElectiveId || ""}
              onChange={(e) =>
                setSelectedElectiveId(e.target.value || undefined)
              }
              label="Eletivo"
              autoFocus
              MenuProps={{ disableAutoFocusItem: true }}
            >
              <MenuItem
                value=""
                data-testid="link-elective-option-none"
              >
                <em>Nenhum (sempre ativo)</em>
              </MenuItem>
              {electiveNodes.map((elective) => (
                <MenuItem
                  key={elective.id}
                  value={elective.id}
                  data-testid={`link-elective-option-${elective.label}`}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      width: "100%",
                    }}
                  >
                    <Typography>{elective.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      (atual: {elective.value ? "sim" : "não"})
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="link-elective-confirm"
          handleConfirm={handleConfirm}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title={tooltipTitle} arrow>
        <IconButton
          data-testid="process-item-link-elective"
          aria-label="link-elective"
          size="small"
          color={currentElective?.value ? "success" : currentElective ? "default" : "primary"}
        >
          <ShortcutHint
            placement="bottom-center"
            shortcutId={`${MODULE_NAME}/ProcessItem/linkElective`}
            alwaysShow={isFocused}
          >
            <HowToVoteSharp />
          </ShortcutHint>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
}
