import { useMemo, useState, useEffect } from "react";
import {
  Box,
  List,
  ListItem,
  IconButton,
  TextField,
  Typography,
  Switch,
  Button,
  FormControl,
  useTheme,
} from "@mui/material";
import { DeleteOutlineSharp, SaveSharp, CancelSharp, ModeEditOutlineSharp } from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";
import useVariation from "../../../hooks/useVariation";
import { debounce } from "@kernel/utils";

export default function ElectiveListAccordion({
  variationId,
  garmentId,
}: Readonly<{
  variationId: string;
  garmentId: string;
}>) {
  const theme = useTheme();
  const variation = useVariation({ variationId });

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph(variationId, (g: any) => g);

  const electiveEdges = graph?.state
    ? Object.values(graph.state.edges).filter((e: any) => e.sourceId === garmentId && e.type === "HAS_ELECTIVE")
    : [];

  const electiveNodes = electiveEdges.map((e: any) => graph.state.nodes[e.targetId]);

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddElectiveButton variationId={variationId} garmentId={garmentId} />
      </Box>

      <List sx={{ p: 0 }}>
        {electiveNodes.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>Nenhum eletivo</Typography>
          </ListItem>
        ) : (
          electiveNodes.map((node: any) => (
            <ElectiveItem key={node.id} node={node} variation={variation} />
          ))
        )}
      </List>
    </>
  );
}

function ElectiveItem({ node, variation }: { node: any; variation: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => ({ label: node.label || "", value: !!node.value, defaultValue: !!node.defaultValue }));
  const debouncedSave = useMemo(() => debounce((changes: any) => variation.actions.updateElective(node.id, changes), 700), [node.id]);

  useEffect(() => {
    // sync form when node changes
    setForm({ label: node.label || "", value: !!node.value, defaultValue: !!node.defaultValue });
  }, [node.id, node.label, node.value, node.defaultValue]);

  // show mode: label + switch for current value + icons (delete, edit)
  if (!isEditing) {
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}>
          <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
          <Typography color="text.secondary">(padrão: {node.defaultValue ? "sim" : "não"})</Typography>
          <Switch checked={!!node.value} onChange={(_, checked) => variation.actions.updateElective(node.id, { value: checked })} color="primary" />
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <IconButton sx={{ "&:hover": { color: "error.main" } }} onClick={() => variation.actions.removeElective(node.id)}>
            <DeleteOutlineSharp color="error" />
          </IconButton>
          <IconButton sx={{ "&:hover": { color: "primary.main" } }} onClick={() => setIsEditing(true)}>
            <ModeEditOutlineSharp color="info" />
          </IconButton>
        </Box>
      </ListItem>
    );
  }


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
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
        <TextField
          label="Nome"
          size="small"
          value={form.label}
          onChange={(e) => {
            setForm((s) => ({ ...s, label: e.target.value }));
            debouncedSave({ label: e.target.value });
          }}
        />
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <FormControl>
            <Typography variant="caption">Valor atual</Typography>
            <Switch checked={form.value} onChange={(_, checked) => { setForm((s) => ({ ...s, value: checked })); debouncedSave({ value: checked }); }} color="primary" />
          </FormControl>
          <FormControl>
            <Typography variant="caption">Valor padrão</Typography>
            <Switch checked={form.defaultValue} onChange={(_, checked) => { setForm((s) => ({ ...s, defaultValue: checked })); debouncedSave({ defaultValue: checked }); }} color="primary" />
          </FormControl>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, ml: 1 }}>
        <IconButton sx={{ "&:hover": { color: "primary.main" } }} onClick={() => { variation.actions.updateElective(node.id, { label: form.label, value: form.value, defaultValue: form.defaultValue }); setIsEditing(false); }}>
          <SaveSharp />
        </IconButton>
        <IconButton sx={{ "&:hover": { color: "error.main" } }} onClick={() => setIsEditing(false)}>
          <CancelSharp />
        </IconButton>
      </Box>
    </ListItem>
  );
}

function AddElectiveButton({ variationId, garmentId }: { variationId: string; garmentId: string }) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const variation = useVariation({ variationId });

  const [name, setName] = useState("");
  const [defaultValue, setDefaultValue] = useState(false);

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 320, padding: 2 }}>
          <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
            <TextField label="Nome do Eletivo" value={name} onChange={(e) => setName(e.target.value)} />
          </FormControl>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, m: 1 }}>
            <Typography>Valor padrão</Typography>
            <Switch checked={defaultValue} onChange={(_, v) => setDefaultValue(v)} />
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" disabled={!name} handleConfirm={() => { variation.actions.addElective(name, garmentId, defaultValue); }}>
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button variant="outlined" color="primary">
        Adicionar Eletivo
      </Button>
    </PointerContainer>
  );
}
