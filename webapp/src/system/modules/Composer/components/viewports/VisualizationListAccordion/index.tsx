import { useState } from "react";
import useModule from "@kernel/hooks/useModule";
import useVariation from "../../../hooks/useVariation";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { ISVGModule } from "@kernel/modules/SVG";
import type { IMaterialsModule } from "@system/modules/Materials";
import {
  Box,
  Button,
  List,
  ListItem,
  Typography,
  IconButton,
  TextField,
  FormControl,
  Switch,
  Select,
  MenuItem,
  Chip,
  useTheme,
} from "@mui/material";
import { DeleteOutlineSharp } from "@mui/icons-material";
import { EditOutlined } from "@mui/icons-material";
import { MaterialNode } from "@system/modules/Composer/typings";

export default function VisualizationListAccordion({
  variationId,
  garmentId,
}: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g) => g);

  const visualizationNodes = graph?.state ? Object.values(graph.state.nodes).filter(
    n => n.type === "VISUALIZATION"
  ) : [];

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddVisualizationButton
          variationId={variationId}
          garmentId={garmentId}
        />
      </Box>

      <List sx={{ p: 0 }}>
        {visualizationNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>
              Nenhuma visualização
            </Typography>
          </ListItem>
        ) : (
          visualizationNodes.map((node: any) => (
            <VisualizationItem
              key={node.id}
              node={node}
              variationId={variationId}
            />
          ))
        )}
      </List>
    </>
  );
}

function VisualizationItem({ node, variationId }: any) {
  const theme = useTheme();
  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);

  const materialsModule = useModule<IMaterialsModule>("Materials");
  const useMaterials = materialsModule.hooks.useMaterials;
  const variation = useVariation({ variationId });
  // find material node referenced
  const materialNode = graph?.state?.nodes?.[node.materialNodeId];
  const materialId = materialNode?.materialId;
  const materials = useMaterials(materialId ? [materialId] : []);
  const material = materialId ? materials[materialId] : undefined;
  // derive material label and color using same logic as MaterialListAccordion
  const materialTypes = materialsModule.hooks.useMaterialTypes();
  const materialType = material ? materialTypes[material.type] : undefined;
  const schema =
    materialType && material
      ? materialType.schemas[material.schemaVersion]
      : undefined;
  const labelText = schema
    ? material?.attributes[schema.selector.principal]
    : undefined;
  const extra = schema?.selector?.extra
    ? material?.attributes[schema.selector.extra]
    : null;
  const colorEntry = Object.entries(schema?.attributes ?? {}).find(
    ([attrName, attrDef]) => attrDef === "color"
  );
  const color = colorEntry
    ? (material?.attributes as any)?.[colorEntry[0]]
    : undefined;

  return (
    <ListItem
      key={node.id}
      sx={{
        mb: 0.5,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography color="text.secondary">Material:</Typography>
          <Typography>{materialNode?.label ?? node.materialNodeId}</Typography>
          {material ? (
            <Chip
              size="small"
              label={labelText ?? extra ?? ""}
              sx={{
                background: color?.hex ?? undefined,
              }}
            />
          ) : null}
        </Box>

        <Box>
          {Array.isArray(node.doms) && node.doms.length ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {node.doms.map((d: any) => (
                <Box
                  key={d.id}
                  sx={{ display: "flex", gap: 2, alignItems: "center" }}
                >
                  <Typography variant="body2">#{d.id}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    fill: {d.fill ? "on" : "off"}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    stroke: {d.stroke ? "on" : "off"}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">
              Sem elementos selecionados
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <VisualizationEditButton node={node} variationId={variationId} />
          <IconButton
            sx={{ "&:hover": { color: theme.palette.error.main } }}
            onClick={() => {
              variation.actions.removeVisualization(node.id);
            }}
          >
            <DeleteOutlineSharp />
          </IconButton>
        </Box>
      </Box>
    </ListItem>
  );
}

function VisualizationEditButton({ node, variationId }: any) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const theme = useTheme();

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);

  const svgModule = useModule<ISVGModule>("SVG");
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();

  const materialsModule = useModule<IMaterialsModule>("Materials");
  const materialNodes: any[] = graph?.state
    ? (Object.values(graph.state.nodes as any) as any[]).filter(
        (n: any) => n.type === "MATERIAL"
      )
    : [];

  const variation = useVariation({ variationId });

  const [name, setName] = useState<string>(node.label ?? ``);
  const [selectedMaterialNodeId, setSelectedMaterialNodeId] = useState<
    string | null
  >(node.materialNodeId ?? null);
  const [doms, setDoms] = useState<
    Array<{ id: string; fill?: boolean; stroke?: boolean }>
  >(Array.isArray(node.doms) ? node.doms.slice() : []);

  function handlePick() {
    svgToolkit.pickElement(
      "SVGElement",
      (root: SVGSVGElement) =>
        Array.from(root.querySelectorAll("*")) as SVGElement[],
      (element: SVGElement) => {
        const id = element.getAttribute("id");
        if (!id) return;
        if (doms.find((d) => d.id === id)) return;
        setDoms((curr) => [...curr, { id, fill: true, stroke: false }]);
      }
    );
  }

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 340, padding: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              label="Nome da Visualização"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <Select
              value={selectedMaterialNodeId ?? ""}
              onChange={(e) =>
                setSelectedMaterialNodeId(e.target.value as string)
              }
              displayEmpty
            >
              {materialNodes.length === 0 ? (
                <MenuItem value="">Nenhum material referenciado</MenuItem>
              ) : null}
              {materialNodes.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Button variant="outlined" onClick={handlePick}>
              Selecionar elemento (Pick)
            </Button>
            <Typography variant="caption" color="text.secondary">
              Clique no elemento no SVG
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {doms.map((d, idx) => (
              <Box
                key={d.id}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <Typography variant="body2">#{d.id}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption">Fill</Typography>
                  <Switch
                    size="small"
                    checked={!!d.fill}
                    onChange={(_, v) =>
                      setDoms((curr) =>
                        curr.map((c, i) => (i === idx ? { ...c, fill: v } : c))
                      )
                    }
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption">Stroke</Typography>
                  <Switch
                    size="small"
                    checked={!!d.stroke}
                    onChange={(_, v) =>
                      setDoms((curr) =>
                        curr.map((c, i) =>
                          i === idx ? { ...c, stroke: v } : c
                        )
                      )
                    }
                  />
                </Box>
                <IconButton
                  sx={{ "&:hover": { color: theme.palette.error.main } }}
                  onClick={() =>
                    setDoms((curr) => curr.filter((_, i) => i !== idx))
                  }
                >
                  <DeleteOutlineSharp />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          disabled={!name || !selectedMaterialNodeId || doms.length === 0}
          handleConfirm={() => {
            if (!selectedMaterialNodeId) return;
            variation.actions.updateVisualization(node.id, {
              label: name,
              materialNodeId: selectedMaterialNodeId,
              doms,
            });
          }}
        >
          Salvar
        </ConfirmAndCloseButton>,
      ]}
    >
      <IconButton sx={{ "&:hover": { color: theme.palette.info.main } }}>
        <EditOutlined />
      </IconButton>
    </PointerContainer>
  );
}

function AddVisualizationButton({ variationId, garmentId }: any) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const variation = useVariation({ variationId });
  const theme = useTheme();

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g) => g);

  const svgModule = useModule<ISVGModule>("SVG");
  const svgToolkit = svgModule.hooks.useSVGEditorToolkit();

  const materialsModule = useModule<IMaterialsModule>("Materials");
  const materialNodes = graph?.state
    ? Object.values(graph.state.nodes).filter(
        (n): n is MaterialNode => n.type === "MATERIAL"
      )
    : [];
  const materialIds = materialNodes
    .map((n) => Number(n.materialId))
    .filter((id) => !Number.isNaN(id));
  const useMaterials = materialsModule.hooks.useMaterials;
  const materials = useMaterials(materialIds);

  const [name, setName] = useState<string>(
    `visual-${Math.random().toString(36).substring(2, 8)}`
  );
  const [selectedMaterialNodeId, setSelectedMaterialNodeId] = useState<
    string | null
  >(materialNodes[0]?.id ?? null);
  const [doms, setDoms] = useState<
    Array<{ id: string; fill?: boolean; stroke?: boolean }>
  >([]);

  function handlePick() {
    svgToolkit.pickElement(
      "SVGElement",
      (root: SVGSVGElement) =>
        Array.from(root.querySelectorAll("*")) as SVGElement[],
      (element: SVGElement) => {
        const id = element.getAttribute("id");
        if (!id) return;
        if (doms.find((d) => d.id === id)) return;
        setDoms((curr) => [...curr, { id, fill: true, stroke: false }]);
      }
    );
  }

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 340, padding: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <TextField
              label="Nome da Visualização"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="small"
            />
          </FormControl>

          <FormControl fullWidth size="small" sx={{ mb: 1 }}>
            <Select
              value={selectedMaterialNodeId ?? ""}
              onChange={(e) =>
                setSelectedMaterialNodeId(e.target.value as string)
              }
              displayEmpty
            >
              {materialNodes.length === 0 ? (
                <MenuItem value="">Nenhum material referenciado</MenuItem>
              ) : null}
              {materialNodes.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center", mb: 1 }}>
            <Button variant="outlined" onClick={handlePick}>
              Selecionar elemento (Pick)
            </Button>
            <Typography variant="caption" color="text.secondary">
              Clique no elemento no SVG
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {doms.map((d, idx) => (
              <Box
                key={d.id}
                sx={{ display: "flex", gap: 1, alignItems: "center" }}
              >
                <Typography variant="body2">#{d.id}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption">Fill</Typography>
                  <Switch
                    size="small"
                    checked={!!d.fill}
                    onChange={(_, v) =>
                      setDoms((curr) =>
                        curr.map((c, i) => (i === idx ? { ...c, fill: v } : c))
                      )
                    }
                  />
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="caption">Stroke</Typography>
                  <Switch
                    size="small"
                    checked={!!d.stroke}
                    onChange={(_, v) =>
                      setDoms((curr) =>
                        curr.map((c, i) =>
                          i === idx ? { ...c, stroke: v } : c
                        )
                      )
                    }
                  />
                </Box>
                <IconButton
                  sx={{ "&:hover": { color: theme.palette.error.main } }}
                  onClick={() =>
                    setDoms((curr) => curr.filter((_, i) => i !== idx))
                  }
                >
                  <DeleteOutlineSharp />
                </IconButton>
              </Box>
            ))}
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          disabled={!name || !selectedMaterialNodeId || doms.length === 0}
          handleConfirm={() => {
            if (!selectedMaterialNodeId) return;
            variation.actions.addVisualization(
              name,
              garmentId,
              selectedMaterialNodeId,
              doms
            );
          }}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button variant="outlined" color="primary">
        Adicionar Visualização
      </Button>
    </PointerContainer>
  );
}
