import { useState, useMemo, useCallback } from "react";
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
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import useVariation from "../../../hooks/useVariation";
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
  const graphModule = useModule<IGraphModule>("Graph");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { useGraph } = graphModule.hooks;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const variation = useVariation({ variationId });
  const graph = useGraph(variationId);

  const [selectedElectiveId, setSelectedElectiveId] = useState<string | undefined>(
    processNode.electiveNodeId
  );

  const electiveNodes = useMemo(() => {
    if (!graph.state) return [];
    return Object.values(graph.state.nodes).filter(
      (n): n is ElectiveNode => n.type === "ELECTIVE"
    );
  }, [graph.state]);

  const currentElective = useMemo(() => {
    if (!processNode.electiveNodeId || !graph.state) return null;
    return graph.state.nodes[processNode.electiveNodeId] as ElectiveNode;
  }, [processNode.electiveNodeId, graph.state]);

  const handleConfirm = useCallback(() => {
    variation.actions.updateProcess(processNode.id, {
      electiveNodeId: selectedElectiveId || undefined,
    });
  }, [selectedElectiveId, processNode.id, variation.actions]);

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
