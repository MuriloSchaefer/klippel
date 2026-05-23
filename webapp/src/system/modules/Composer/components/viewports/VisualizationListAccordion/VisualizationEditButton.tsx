import { useState } from "react";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DeleteOutlineSharp, EditOutlined } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ISVGModule } from "@kernel/modules/SVG";
import { Store } from "@kernel/modules/Store";
import { shallowEqual } from "react-redux";
import type {
  MaterialNode,
  VisualizationDom,
  VisualizationNode,
} from "../../../typings";
import { useVariationActions } from "../../../hooks/useVariationActions";
import { MODULE_NAME } from "../../../constants";

export default function VisualizationEditButton({
  node,
  variationId,
  isFocused,
  onClose,
}: {
  node: VisualizationNode;
  variationId: string;
  isFocused: boolean;
  onClose?: () => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const storeModule = useModule<Store>("Store");
  const svgModule = useModule<ISVGModule>("SVG");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const { actions } = useVariationActions({ variationId });
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();

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

  const [name, setName] = useState<string>(node.label ?? "");
  const [materialNodeId, setMaterialNodeId] = useState<string>(
    node.materialNodeId ?? "",
  );
  const [doms, setDoms] = useState<VisualizationDom[]>(
    (node.doms ?? []).map((d) => ({ ...d })),
  );
  const [pendingId, setPendingId] = useState<string>("");

  const addDom = (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setDoms((curr) =>
      curr.find((d) => d.id === trimmed)
        ? curr
        : [...curr, { id: trimmed, fill: true, stroke: false }],
    );
  };

  const commitPendingIds = () => {
    if (!pendingId.trim()) return;
    pendingId
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .forEach(addDom);
    setPendingId("");
  };

  function handlePick() {
    svgToolkit.pickElement(
      "SVGElement",
      (root: SVGSVGElement) =>
        Array.from(root.querySelectorAll("*")) as SVGElement[],
      (element: SVGElement) => {
        const id = element.getAttribute("id");
        if (!id) return;
        addDom(id);
      },
    );
  }

  const canConfirm = !!name && !!materialNodeId && doms.length > 0;

  return (
    <PointerContainer
      onClose={() => onClose?.()}
      component={
        <Box
          data-testid="edit-visualization-form"
          sx={{ minWidth: 360, padding: 2 }}
        >
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              data-testid="edit-visualization-name"
              label="Nome da Visualização"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <Select
              data-testid="edit-visualization-material-select"
              inputProps={{
                "data-testid": "edit-visualization-material-select-input",
              }}
              value={materialNodeId}
              onChange={(e) => setMaterialNodeId(e.target.value as string)}
              displayEmpty
            >
              {materialNodes.length === 0 ? (
                <MenuItem value="">Nenhum material referenciado</MenuItem>
              ) : null}
              {materialNodes.map((m) => (
                <MenuItem
                  key={m.id}
                  value={m.id}
                  data-testid={`edit-visualization-material-option-${m.label}`}
                >
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <TextField
              data-testid="edit-visualization-dom-input"
              label="Adicionar elemento por id"
              value={pendingId}
              onChange={(e) => setPendingId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitPendingIds();
                }
              }}
              size="small"
              fullWidth
            />
            <Button
              data-testid="edit-visualization-dom-add"
              variant="outlined"
              size="small"
              onClick={commitPendingIds}
              disabled={!pendingId.trim()}
            >
              Adicionar
            </Button>
            <Button
              data-testid="edit-visualization-pick"
              variant="outlined"
              size="small"
              onClick={handlePick}
            >
              Selecionar
            </Button>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {doms.map((d) => (
              <Box
                key={d.id}
                data-testid="edit-visualization-dom"
                data-dom-id={d.id}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  #{d.id}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      data-testid={`edit-visualization-dom-fill-${d.id}`}
                      checked={!!d.fill}
                      onChange={(_, v) =>
                        setDoms((curr) =>
                          curr.map((c) =>
                            c.id === d.id ? { ...c, fill: v } : c,
                          ),
                        )
                      }
                      size="small"
                    />
                  }
                  label="Fill"
                />
                <FormControlLabel
                  control={
                    <Switch
                      data-testid={`edit-visualization-dom-stroke-${d.id}`}
                      checked={!!d.stroke}
                      onChange={(_, v) =>
                        setDoms((curr) =>
                          curr.map((c) =>
                            c.id === d.id ? { ...c, stroke: v } : c,
                          ),
                        )
                      }
                      size="small"
                    />
                  }
                  label="Stroke"
                />
                <IconButton
                  data-testid={`edit-visualization-dom-remove-${d.id}`}
                  aria-label={`remove-dom-${d.id}`}
                  size="small"
                  onClick={() =>
                    setDoms((curr) => curr.filter((c) => c.id !== d.id))
                  }
                >
                  <DeleteOutlineSharp fontSize="small" color="error" />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="edit-visualization-confirm"
          disabled={!canConfirm}
          handleConfirm={() => {
            if (!canConfirm) return;
            actions.updateVisualization(node.id, {
              label: name,
              materialNodeId,
              doms,
            });
          }}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <IconButton
        data-testid="visualization-item-edit"
        aria-label="edit-visualization"
        sx={{ "&:hover": { color: "primary.main" } }}
      >
        <ShortcutHint
          placement="bottom-center"
          shortcutId={`${MODULE_NAME}/VisualizationItem/editVisualization`}
          alwaysShow={isFocused}
        >
          <EditOutlined color="info" />
        </ShortcutHint>
      </IconButton>
    </PointerContainer>
  );
}
