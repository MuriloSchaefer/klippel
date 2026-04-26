import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Box,
  List,
  ListItem,
  IconButton,
  TextField,
  Typography,
  Button,
  FormControl,
  useTheme,
} from "@mui/material";
import {
  DeleteOutlineSharp,
  SaveSharp,
  CancelSharp,
  ModeEditOutlineSharp,
  ArrowUpward,
  ArrowDownward,
} from "@mui/icons-material";
import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";
import useVariation from "../../../hooks/useVariation";
import { debounce } from "@kernel/utils";
import { VariationGraphState } from "@system/modules/Composer/typings";

// Graduation list accordion
// - add multiple graduations by comma in the add form
// - deterministic reorder using Up/Down buttons
// - rename, delete

type GraduationNode = any; // keep flexible to match graph typings in repo

export default function GraduationListAccordion({ variationId, garmentId }: Readonly<{ variationId: string; garmentId: string }>) {
  const theme = useTheme();
  const variation = useVariation({ variationId });

  const graphModule = useModule<IGraphModule>("Graph");
  const useGraph = graphModule.hooks.useGraph;
  const graph = useGraph<VariationGraphState>(variationId);

  const graduationEdges = graph?.state
    ? Object.values(graph.state.edges).filter((e: any) => e.sourceId === garmentId && e.type === "HAS_GRADUATION")
    : [];

  const graduationNodes = graduationEdges.map((e: any) => graph.state?.nodes[e.targetId]).filter(Boolean) as GraduationNode[];

  // sorted by stored order (fallback to 0)
  const sortedGraduations = useMemo(() => {
    const copy = [...graduationNodes];
    copy.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
    return copy;
  }, [graduationNodes]);


  const moveUp = (index: number) => {
    if (index <= 0) return;
    const ids = sortedGraduations.map((n) => n.id);
    const copy = [...ids];
    [copy[index - 1], copy[index]] = [copy[index], copy[index - 1]];
    // capture current positions
    variation.actions.reorderGraduations(copy);
  };

  const moveDown = (index: number) => {
    if (index >= sortedGraduations.length - 1) return;
    const ids = sortedGraduations.map((n) => n.id);
    const copy = [...ids];
    [copy[index], copy[index + 1]] = [copy[index + 1], copy[index]];
    variation.actions.reorderGraduations(copy);
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1 }}>
        <AddGraduationButton variationId={variationId} garmentId={garmentId} />
      </Box>

  <List sx={{ p: 0 }}>
        {sortedGraduations.length === 0 ? (
          <ListItem>
            <Typography color={theme.palette.text.secondary}>Nenhuma graduação</Typography>
          </ListItem>
        ) : (
          sortedGraduations.map((node: GraduationNode, idx: number) => (
            <Box key={node.id}>
              <GraduationItem
                node={node}
                variationId={variationId}
                garmentId={garmentId}
                index={idx}
                moveUp={() => moveUp(idx)}
                moveDown={() => moveDown(idx)}
                canMoveUp={idx > 0}
                canMoveDown={idx < sortedGraduations.length - 1}
              />
            </Box>
          ))
        )}

      </List>
    </>
  );
}

function GraduationItem({ node, variationId, garmentId, index, moveUp, moveDown, canMoveUp, canMoveDown }: any) {
  // keep hooks inside component
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(() => ({ label: node.label ?? "", amount: node.amount ?? 0 }));

  useEffect(() => {
    setForm({ label: node.label ?? "", amount: node.amount ?? 0 });
  }, [node.id, node.label, node.amount]);

  // Debounced update via graph API — use useVariation locally to call updateGraduation and removal
  const variation = useVariation({ variationId });
  const debouncedSave = useMemo(() => debounce((changes: any) => variation.actions.updateGraduation(node.id, changes), 400), [node.id]);

  const handleAmountChange = (value: number) => {
    const sanitized = Number.isFinite(value) && value >= 0 ? Math.max(0, Math.round(value)) : 0;
    setForm((s: any) => ({ ...s, amount: sanitized }));
    debouncedSave({ amount: sanitized });
  };

  return (
    <ListItem
      data-node-id={node.id}
      sx={{
        mb: 0.5,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        p: 1,
      }}
    >
      {!isEditing ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1, flexWrap: "wrap" }}>
          <Box sx={{ width: 28 }} />
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 200 }}>
            <Typography sx={{ fontWeight: 500 }}>{node.label}</Typography>
            <Typography color="text.secondary">Ordem: {node.order ?? index}</Typography>
          </Box>
          <TextField
            label="Quantidade"
            size="small"
            type="number"
            value={form.amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            sx={{ width: 120 }}
          />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flexGrow: 1 }}>
          <TextField label="Nome" size="small" value={form.label} onChange={(e) => { setForm((s) => ({ ...s, label: e.target.value })); debouncedSave({ label: e.target.value }); }} />
          <TextField
            label="Quantidade"
            size="small"
            type="number"
            value={form.amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            sx={{ width: 120 }}
          />
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {!isEditing ? (
          <>
            <IconButton sx={{ "&:hover": { color: "error.main" } }} onClick={() => variation.actions.removeGraduation(node.id)}>
              <DeleteOutlineSharp color="error" />
            </IconButton>
            <IconButton sx={{ "&:hover": { color: "primary.main" } }} onClick={() => setIsEditing(true)}>
              <ModeEditOutlineSharp color="info" />
            </IconButton>
            <IconButton aria-label="move-up" disabled={!canMoveUp} onClick={moveUp}>
              <ArrowUpward fontSize="small" />
            </IconButton>
            <IconButton aria-label="move-down" disabled={!canMoveDown} onClick={moveDown}>
              <ArrowDownward fontSize="small" />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton sx={{ "&:hover": { color: "primary.main" } }} onClick={() => { variation.actions.updateGraduation(node.id, { label: form.label }); setIsEditing(false); }}>
              <SaveSharp />
            </IconButton>
            <IconButton sx={{ "&:hover": { color: "error.main" } }} onClick={() => setIsEditing(false)}>
              <CancelSharp />
            </IconButton>
          </>
        )}
      </Box>
    </ListItem>
  );
}

function AddGraduationButton({ variationId, garmentId }: { variationId: string; garmentId: string }) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const variation = useVariation({ variationId });
  const [names, setNames] = useState("");

  // When confirm, split by comma and trim; keep order; create nodes in that order
  async function handleConfirm() {
    const splitNames = names
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (splitNames.length === 0) return;

    variation.actions.addGraduations(splitNames, garmentId);
    setNames("");
  }

  return (
    <PointerContainer
      component={
        <Box sx={{ minWidth: 360, padding: 2 }}>
          <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
              <TextField
              label="Nova(s) Graduação(s) — separadas por vírgula"
              placeholder="Ex: P, M, G ou 34,36,38"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              multiline
              helperText="Você pode adicionar múltiplas graduações separando por vírgula ','. Elas serão criadas na ordem informada."
            />
          </FormControl>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton key="confirm" disabled={!names.trim()} handleConfirm={handleConfirm}>
          Adicionar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Button variant="outlined" color="primary">
        Adicionar Graduação
      </Button>
    </PointerContainer>
  );
}
