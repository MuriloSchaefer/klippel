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
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";

import type { IMaterialsModule } from "@system/modules/Materials";
import { useCallback, useMemo, useState } from "react";
import {
  ConsumesEdge,
  GraduationNode,
  MaterialNode,
} from "@system/modules/Composer/typings";
import useVariation from "@system/modules/Composer/hooks/useVariation";
import { MODULE_NAME } from "@system/modules/Composer/constants";
import { CompoundValue } from "@system/modules/Converter/typings";
import CompoundSelector from "@system/modules/Converter/components/CompoundSelector";
import Edge from "@kernel/modules/Graphs/interfaces/Edge";

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
  const graphModule = useModule<IGraphModule>("Graph");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  const { MaterialSelector } = materialsModule.components;

  const { useGraph } = graphModule.hooks;
  const { useMaterials } = materialsModule.hooks;

  const materials = useMaterials();
  const variation = useVariation({ variationId });
  const graph = useGraph(variationId);
  const [newForm, setNewForm] = useState<{
    materialNodeId?: string;
    amount: CompoundValue;
  }>({
    materialNodeId: undefined,
    amount: {
      quotient: { amount: 1, unit: "kilogramas6" },
      dividend: { amount: 1, unit: "unitario18" },
    },
  });

  const graphMaterials = useMemo(
    () =>
      Object.values(graph.state?.nodes ?? {}).filter(
        (n): n is MaterialNode => n.type === "MATERIAL"
      ),
    [graph.state]
  );

  const selectedNodeMaterial = useMemo(() => {
    if (!newForm.materialNodeId || !materials) return undefined;
    const node = graphMaterials.find((n) => n.id === newForm.materialNodeId);
    return node ? materials[node.materialId] : undefined;
  }, [graphMaterials, materials, newForm.materialNodeId]);

  const handleAddNewRecord = useCallback(() => {
    if (!graph.state) return;
    if (!newForm.materialNodeId)
      throw Error("Material nao encontrado no modelo. Adicione-o antes");
    variation.actions.addProcessMaterialConsumption(
      processNodeId,
      newForm.materialNodeId,
      newForm.amount
    );
    setNewForm({
      materialNodeId: undefined,
      amount: {
        quotient: { amount: 1, unit: "kilogramas6" },
        dividend: { amount: 1, unit: "unitario18" },
      },
    });
  }, [graph, newForm.materialNodeId, newForm.amount, processNodeId, variation.actions]);

  const handleMaterialUsageUpdate = useCallback(
    (e: Edge, v: CompoundValue) => {
      const materialNode = graph.state!.nodes[e.targetId] as MaterialNode;

      variation.actions.updateProcessMaterialConsumption(
        processNodeId,
        materialNode.id,
        v
      );
    },
    [variation, graph.state]
  )

  const graduations = useMemo(
    () =>
      Object.values(graph.state?.nodes ?? {})
        .filter((n): n is GraduationNode => n.type === "GRADUATION")
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [graph.state]
  );

  if (!graph.state) return null;

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
              {Object.values(graph.state.edges)
                .filter(
                  (e): e is ConsumesEdge =>
                    e.type === "CONSUMES" && e.sourceId === processNodeId
                )
                .map((e) => {
                  const materialNode = graph.state!.nodes[
                    e.targetId
                  ] as MaterialNode;
                  const material = materials![materialNode.materialId];
                  return (
                    <ListItem
                      key={e.id}
                      sx={{ flexDirection: "column", alignItems: "stretch" }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <FormControl>
                          <MaterialSelector
                            type={material.type}
                            value={material.id}
                            disabled
                          />
                        </FormControl>
                        <FormControl>
                          <CompoundSelector
                            value={e.amount}
                            onChange={(v) => handleMaterialUsageUpdate(e, v)}
                          />
                        </FormControl>
                        <IconButton>
                          <DeleteSharp
                            color="error"
                            onClick={() =>
                              variation.actions.removeProcessMaterialConsumption(
                                processNodeId,
                                materialNode.id
                              )
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
                              {Object.keys(e.consumptionPerGrade ?? {}).length >
                                0 &&
                                ` · ${
                                  Object.keys(e.consumptionPerGrade ?? {}).length
                                } personalizada(s)`}
                            </Typography>
                          </AccordionSummary>
                          <AccordionDetails sx={{ px: 1 }}>
                          <Stack spacing={1}>
                            {graduations.map((g) => {
                              const isOverride =
                                !!e.consumptionPerGrade?.[g.id];
                              const consumption =
                                e.consumptionPerGrade?.[g.id] ?? e.amount;
                              const delta = e.gradeDeltas?.[g.id];
                              return (
                                <Box
                                  key={g.id}
                                  data-testid="link-material-grade-row"
                                  data-graduation-label={g.label}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <Typography
                                    variant="body2"
                                    sx={{ minWidth: 80 }}
                                  >
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
                                            variation.actions.setProcessMaterialConsumptionForGraduation(
                                              processNodeId,
                                              materialNode.id,
                                              g.id,
                                              e.amount
                                            );
                                          } else {
                                            variation.actions.clearProcessMaterialConsumptionForGraduation(
                                              processNodeId,
                                              materialNode.id,
                                              g.id
                                            );
                                          }
                                        }}
                                      />
                                    }
                                    label={
                                      isOverride ? "personalizar" : "usar padrão"
                                    }
                                  />
                                  <FormControl data-testid="link-material-grade-consumption">
                                    <CompoundSelector
                                      value={consumption}
                                      onChange={(v) =>
                                        variation.actions.setProcessMaterialConsumptionForGraduation(
                                          processNodeId,
                                          materialNode.id,
                                          g.id,
                                          v
                                        )
                                      }
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
