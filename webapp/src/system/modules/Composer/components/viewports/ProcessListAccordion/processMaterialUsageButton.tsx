import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DeleteSharp, ExpandMoreSharp, TableViewSharp } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  List,
  ListItem,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
  Typography,
} from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { batch, shallowEqual } from "react-redux";
import { debounce } from "@kernel/utils";

import type { IMaterialsModule } from "@system/modules/Materials";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import { resolveTypeSchema } from "@system/modules/Materials/store/materialTypes/resolveTypeSchema";
import {
  ConsumesEdge,
  GraduationNode,
  MaterialNode,
} from "@system/modules/Composer/typings";
import { useVariationActions } from "@system/modules/Composer/hooks/useVariationActions";
import { MODULE_NAME } from "@system/modules/Composer/constants";
import { CompoundValue } from "@system/modules/Converter/typings";
import CompoundSelector from "@system/modules/Converter/components/CompoundSelector";
import Edge from "@kernel/modules/Graphs/interfaces/Edge";

// ---------------------------------------------------------------------------
// ConsumesEdgeRow — one material consumption entry with local state + debounced dispatch
// ---------------------------------------------------------------------------

type VariationActions = ReturnType<typeof useVariationActions>["actions"];

interface ConsumesEdgeRowProps {
  edge: ConsumesEdge;
  materialNode: MaterialNode;
  material: MaterialState;
  graduations: GraduationNode[];
  processNodeId: string;
  actions: VariationActions;
  MaterialSelector: React.ComponentType<{ type: string; value: string; disabled?: boolean }>;
}

const ConsumesEdgeRow = React.memo(function ConsumesEdgeRow({
  edge,
  materialNode,
  material,
  graduations,
  processNodeId,
  actions,
  MaterialSelector,
}: ConsumesEdgeRowProps) {
  // Local state mirrors Redux so the controlled TextField shows keystrokes immediately.
  const [localAmount, setLocalAmount] = useState(edge.amount);
  const [localGrade, setLocalGrade] = useState<Record<string, CompoundValue>>({});

  // Track the last value we dispatched so we don't incorrectly re-sync local state
  // from our own dispatch settling back from Redux.
  const lastDispatchedAmountRef = useRef(edge.amount);
  const pendingGradeRef = useRef<Record<string, CompoundValue>>({});

  // Sync localAmount when the Redux edge.amount changes externally (undo, remote peer).
  useEffect(() => {
    if (edge.amount !== lastDispatchedAmountRef.current) {
      setLocalAmount(edge.amount);
      lastDispatchedAmountRef.current = edge.amount;
    }
  }, [edge.amount]);

  // Reset local grade overrides when Redux consumptionPerGrade changes externally
  // (e.g. the toggle switch adds/removes an override, or remote sync).
  const consumptionPerGrade = edge.consumptionPerGrade;
  useEffect(() => {
    setLocalGrade({});
    pendingGradeRef.current = {};
  }, [consumptionPerGrade]);

  const debouncedUpdateAmount = useMemo(
    () =>
      debounce((v: CompoundValue) => {
        lastDispatchedAmountRef.current = v;
        actions.updateProcessMaterialConsumption(processNodeId, materialNode.id, v);
      }, 300),
    [processNodeId, materialNode.id, actions],
  );

  // Batch-flush all pending grade updates in one Redux commit.
  const debouncedFlushGrades = useMemo(
    () =>
      debounce(() => {
        const updates = { ...pendingGradeRef.current };
        pendingGradeRef.current = {};
        batch(() => {
          for (const [gId, v] of Object.entries(updates)) {
            actions.setProcessMaterialConsumptionForGraduation(
              processNodeId,
              materialNode.id,
              gId,
              v,
            );
          }
        });
      }, 300),
    [processNodeId, materialNode.id, actions],
  );


  const handleAmountChange = useCallback(
    (v: CompoundValue) => {
      setLocalAmount(v);
      lastDispatchedAmountRef.current = v;
      debouncedUpdateAmount(v);
    },
    [debouncedUpdateAmount],
  );

  const handleGradeChange = useCallback(
    (graduationId: string, v: CompoundValue) => {
      setLocalGrade((prev) => ({ ...prev, [graduationId]: v }));
      pendingGradeRef.current = { ...pendingGradeRef.current, [graduationId]: v };
      debouncedFlushGrades();
    },
    [debouncedFlushGrades],
  );

  return (
    <ListItem sx={{ flexDirection: "column", alignItems: "stretch" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FormControl>
          <MaterialSelector type={material.type} value={material.id} disabled />
        </FormControl>
        <FormControl>
          <CompoundSelector value={localAmount} onChange={handleAmountChange} />
        </FormControl>
        <IconButton>
          <DeleteSharp
            color="error"
            onClick={() =>
              actions.removeProcessMaterialConsumption(processNodeId, materialNode.id)
            }
          />
        </IconButton>
      </Box>

      {graduations.length > 0 && (
        <Accordion
          data-testid="link-material-grade-accordion"
          disableGutters
          elevation={0}
          sx={{
            mt: 1,
            "&:before": { display: "none" },
            backgroundColor: "transparent",
          }}
        >
          <AccordionSummary
            data-testid="link-material-grade-accordion-summary"
            expandIcon={<ExpandMoreSharp />}
            sx={{ px: 1, minHeight: 32 }}
          >
            <Typography variant="caption" color="text.secondary">
              Consumo por graduação
              {Object.keys(edge.consumptionPerGrade ?? {}).length > 0 &&
                ` · ${Object.keys(edge.consumptionPerGrade ?? {}).length} personalizada(s)`}
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 1 }}>
            <Stack spacing={1}>
              {graduations.map((g) => {
                const isOverride = !!edge.consumptionPerGrade?.[g.id];
                const reduxValue = edge.consumptionPerGrade?.[g.id] ?? edge.amount;
                const displayValue = localGrade[g.id] ?? reduxValue;
                const delta = edge.gradeDeltas?.[g.id];
                return (
                  <Box
                    key={g.id}
                    data-testid="link-material-grade-row"
                    data-graduation-label={g.label}
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <Typography variant="body2" sx={{ minWidth: 80 }}>
                      {g.label}
                    </Typography>
                    <FormControlLabel
                      data-testid="link-material-grade-switch"
                      control={
                        <Switch
                          size="small"
                          checked={isOverride}
                          onChange={(_, checked) => {
                            if (checked) {
                              actions.setProcessMaterialConsumptionForGraduation(
                                processNodeId,
                                materialNode.id,
                                g.id,
                                edge.amount,
                              );
                            } else {
                              actions.clearProcessMaterialConsumptionForGraduation(
                                processNodeId,
                                materialNode.id,
                                g.id,
                              );
                            }
                          }}
                        />
                      }
                      label={isOverride ? "personalizar" : "usar padrão"}
                    />
                    <FormControl data-testid="link-material-grade-consumption">
                      <CompoundSelector
                        value={displayValue}
                        onChange={(v) => handleGradeChange(g.id, v)}
                      />
                    </FormControl>
                    <Chip
                      size="small"
                      label={
                        delta === undefined
                          ? "—"
                          : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`
                      }
                      color={
                        delta === undefined
                          ? "default"
                          : delta >= 0
                          ? "success"
                          : "warning"
                      }
                      variant="outlined"
                    />
                  </Box>
                );
              })}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </ListItem>
  );
});

// ---------------------------------------------------------------------------
// ProcessMaterialUsageButton
// ---------------------------------------------------------------------------

/**
 * Last-resort seed for a new consumption row, used when the selected
 * material's type declares neither a consumption nor a stock unit.
 */
const defaultConsumption = (): CompoundValue => ({
  quotient: { amount: 1, unit: "kilogramas6" },
  dividend: { amount: 1, unit: "unitario18" },
});

export default function ProcessMaterialUsageButton({
  variationId,
  processNodeId,
  isFocused,
  onClose,
}: {
  variationId: string;
  processNodeId: string;
  isFocused?: boolean;
  onClose?: () => void;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const storeModule = useModule<Store>("Store");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { MaterialSelector } = materialsModule.components;
  const { useAppSelector } = storeModule.hooks;

  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  const materialTypes = useMaterialTypes();
  const { actions } = useVariationActions({ variationId });

  const [newForm, setNewForm] = useState<{
    materialNodeId?: string;
    amount: CompoundValue;
  }>({
    materialNodeId: undefined,
    amount: defaultConsumption(),
  });

  // Fix 3: custom equality guards — only re-render when fields used in the UI change,
  // not when computation middleware adds computedCost/computedProcessTime etc.
  const graphMaterials = useAppSelector(
    (s: any): MaterialNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[]).filter(
        (n): n is MaterialNode => n.type === "MATERIAL",
      );
    },
    (prev, next) => {
      if (prev.length !== next.length) return false;
      return prev.every(
        (n, i) =>
          n.id === next[i].id &&
          n.label === next[i].label &&
          n.materialId === next[i].materialId,
      );
    },
  );

  const graduations = useAppSelector(
    (s: any): GraduationNode[] => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return [];
      return (Object.values(nodes) as any[])
        .filter((n): n is GraduationNode => n.type === "GRADUATION")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    },
    (prev, next) => {
      if (prev.length !== next.length) return false;
      return prev.every(
        (n, i) =>
          n.id === next[i].id &&
          n.label === next[i].label &&
          n.order === next[i].order &&
          n.amount === next[i].amount,
      );
    },
  );

  const consumesEdges = useAppSelector(
    (s: any): ConsumesEdge[] => {
      const edges = s.Graph?.graphs?.[variationId]?.edges;
      if (!edges) return [];
      return (Object.values(edges) as any[]).filter(
        (e): e is ConsumesEdge =>
          e.type === "CONSUMES" && e.sourceId === processNodeId,
      );
    },
    shallowEqual,
  );

  const graphNodes = useAppSelector(
    (s: any): Record<string, MaterialNode> => {
      const nodes = s.Graph?.graphs?.[variationId]?.nodes;
      if (!nodes) return {};
      const result: Record<string, MaterialNode> = {};
      for (const n of Object.values(nodes) as any[]) {
        if (n.type === "MATERIAL") result[n.id] = n as MaterialNode;
      }
      return result;
    },
    (prev, next) => {
      const pk = Object.keys(prev);
      const nk = Object.keys(next);
      if (pk.length !== nk.length) return false;
      return pk.every((k) => prev[k]?.id === next[k]?.id && prev[k]?.materialId === next[k]?.materialId);
    },
  );

  // Only the materials this variation's graph actually references — bounded by
  // the model, not by the catalog. Subscribing to the whole map re-rendered
  // this button on every catalog tick
  // (docs/analysis/materials-catalog-lag-analysis.md, F3).
  const referencedMaterialIds = useMemo(
    () =>
      Array.from(
        new Set(
          graphMaterials
            .map((n) => n.materialId)
            .filter((id): id is string => Boolean(id)),
        ),
      ),
    [graphMaterials],
  );
  const materials = useMaterials(referencedMaterialIds);

  const selectedNodeMaterial =
    newForm.materialNodeId && materials
      ? (() => {
          const node = graphMaterials.find((n) => n.id === newForm.materialNodeId);
          return node ? materials[node.materialId] : undefined;
        })()
      : undefined;

  // Unit the selected material's usage is measured in — the type
  // schema's `consumptionUnit`, falling back to its stock unit. Seeding
  // the form with it means the user types a number in the unit the
  // result is reported in, instead of one that gets silently converted.
  const selectedConsumptionUnit = useMemo(() => {
    if (!selectedNodeMaterial) return undefined;
    const schema = resolveTypeSchema(
      materialTypes?.[selectedNodeMaterial.type],
      selectedNodeMaterial.schemaVersion,
    );
    return schema?.consumptionUnit || selectedNodeMaterial.stock?.unit || undefined;
  }, [selectedNodeMaterial, materialTypes]);

  useEffect(() => {
    if (!selectedConsumptionUnit) return;
    setNewForm((curr) =>
      curr.amount.quotient.unit === selectedConsumptionUnit
        ? curr
        : {
            ...curr,
            amount: {
              ...curr.amount,
              quotient: { ...curr.amount.quotient, unit: selectedConsumptionUnit },
            },
          },
    );
  }, [selectedConsumptionUnit]);

  const handleAddNewRecord = useCallback(() => {
    if (!newForm.materialNodeId)
      throw Error("Material nao encontrado no modelo. Adicione-o antes");
    actions.addProcessMaterialConsumption(
      processNodeId,
      newForm.materialNodeId,
      newForm.amount,
    );
    setNewForm({
      materialNodeId: undefined,
      amount: defaultConsumption(),
    });
  }, [newForm.materialNodeId, newForm.amount, processNodeId, actions]);

  return (
    <PointerContainer
      onClose={() => onClose?.()}
      component={
        <Box data-testid="link-material-form">
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Material</InputLabel>
                <Select
                  data-testid="link-material-select"
                  size="small"
                  label="Nó"
                  autoFocus
                  MenuProps={{ disableAutoFocusItem: true }}
                  value={newForm.materialNodeId ?? ""}
                  onChange={(e) =>
                    setNewForm((curr) => ({
                      ...curr,
                      materialNodeId: e.target.value as string,
                    }))
                  }
                >
                  {graphMaterials.map((n) => (
                    <MenuItem
                      key={n.id}
                      value={n.id}
                      data-testid={`link-material-option-${n.label}`}
                    >
                      {n.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {selectedNodeMaterial && (
                <FormControl key={selectedNodeMaterial.id}>
                  <MaterialSelector
                    type={selectedNodeMaterial.type}
                    value={selectedNodeMaterial.id}
                    disabled
                  />
                </FormControl>
              )}
            </Box>
            <FormControl data-testid="link-material-amount">
              <CompoundSelector
                value={newForm.amount}
                onChange={(v) =>
                  setNewForm((curr) => ({
                    ...curr,
                    amount: v,
                  }))
                }
              />
            </FormControl>
            <Button
              data-testid="link-material-add"
              onClick={handleAddNewRecord}
            >
              Adicionar
            </Button>
            <Divider />
            <List>
              {consumesEdges.map((e) => {
                const materialNode = graphNodes[e.targetId];
                if (!materialNode || !materials) return null;
                const material = materials[materialNode.materialId];
                if (!material) return null;
                return (
                  <ConsumesEdgeRow
                    key={e.id}
                    edge={e}
                    materialNode={materialNode}
                    material={material}
                    graduations={graduations}
                    processNodeId={processNodeId}
                    actions={actions}
                    MaterialSelector={MaterialSelector}
                  />
                );
              })}
            </List>
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          key="confirm"
          data-testid="link-material-confirm"
          handleConfirm={() => {}}
        >
          Confirmar
        </ConfirmAndCloseButton>,
      ]}
    >
      <Tooltip title="Vincular material ao processo" arrow>
        <IconButton
          data-testid="process-item-link-material"
          aria-label="link-material"
          size="small"
        >
          <ShortcutHint
            placement="bottom-center"
            shortcutId={`${MODULE_NAME}/ProcessItem/linkMaterial`}
            alwaysShow={isFocused}
          >
            <TableViewSharp color="secondary" />
          </ShortcutHint>
        </IconButton>
      </Tooltip>
    </PointerContainer>
  );
}
