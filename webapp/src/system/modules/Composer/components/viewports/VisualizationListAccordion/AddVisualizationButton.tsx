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
import { DeleteOutlineSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ISVGModule } from "@kernel/modules/SVG";
import type {
  MaterialNode,
  VariationGraphState,
  VisualizationDom,
} from "../../../typings";
import useVariation from "../../../hooks/useVariation";
import { MODULE_NAME } from "../../../constants";

export default function AddVisualizationButton({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const graphModule = useModule<IGraphModule>("Graph");
  const svgModule = useModule<ISVGModule>("SVG");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;

  const variation = useVariation({ variationId });
  const graph = graphModule.hooks.useGraph<VariationGraphState>(variationId);
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();

  const materialNodes = graph?.state
    ? Object.values(graph.state.nodes).filter(
        (n): n is MaterialNode => n.type === "MATERIAL",
      )
    : [];

  const [name, setName] = useState<string>(
    `visual-${Math.random().toString(36).substring(2, 8)}`,
  );
  const [materialNodeId, setMaterialNodeId] = useState<string>(
    materialNodes[0]?.id ?? "",
  );
  const [doms, setDoms] = useState<VisualizationDom[]>([]);
  const [pendingId, setPendingId] = useState<string>("");

  const resetForm = () => {
    setName(`visual-${Math.random().toString(36).substring(2, 8)}`);
    setMaterialNodeId(materialNodes[0]?.id ?? "");
    setDoms([]);
    setPendingId("");
  };

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
      onClose={resetForm}
      component={
        <Box
          data-testid="add-visualization-form"
          sx={{ minWidth: 360, padding: 2 }}
        >
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              data-testid="add-visualization-name"
              label="Nome da Visualização"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <Select
              data-testid="add-visualization-material-select"
              inputProps={{
                "data-testid": "add-visualization-material-select-input",
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
                  data-testid={`add-visualization-material-option-${m.label}`}
                >
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <TextField
              data-testid="add-visualization-dom-input"
              label="Adicionar elemento por id"
              placeholder="Ex: rect-border, circle-1"
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
              helperText="Digite o id e pressione Enter, ou separe vários por vírgula."
            />
            <Button
              data-testid="add-visualization-dom-add"
              variant="outlined"
              size="small"
              onClick={commitPendingIds}
              disabled={!pendingId.trim()}
            >
              Adicionar
            </Button>
            <Button
              data-testid="add-visualization-pick"
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
                data-testid="add-visualization-dom"
                data-dom-id={d.id}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <Typography variant="body2" sx={{ minWidth: 120 }}>
                  #{d.id}
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      data-testid={`add-visualization-dom-fill-${d.id}`}
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
                      data-testid={`add-visualization-dom-stroke-${d.id}`}
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
                  data-testid={`add-visualization-dom-remove-${d.id}`}
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
          data-testid="add-visualization-confirm"
          disabled={!canConfirm}
          handleConfirm={() => {
            if (!canConfirm) return;
            variation.actions.addVisualization(
              name,
              garmentId,
              materialNodeId,
              doms,
            );
            resetForm();
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button
        id="composer-add-visualization"
        data-testid="add-visualization"
        aria-label="add-visualization"
        variant="outlined"
        color="primary"
      >
        <ShortcutHint
          placement="top-center"
          shortcutId={`${MODULE_NAME}/VisualizationList/addVisualization`}
        >
          <Typography>Adicionar Visualização</Typography>
        </ShortcutHint>
      </Button>
    </PointerContainer>
  );
}
