import { DeleteSharp, TableViewSharp } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  FormControl,
  IconButton,
  List,
  ListItem,
} from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { IPointerModule } from "@kernel/modules/Pointer";

import type { IMaterialsModule } from "@system/modules/Materials";
import { useCallback, useMemo, useState } from "react";
import {
  ConsumesEdge,
  MaterialNode,
} from "@system/modules/Composer/typings";
import useVariation from "@system/modules/Composer/hooks/useVariation";
import { CompoundValue } from "@system/modules/Converter/typings";
import CompoundSelector from "@system/modules/Converter/components/CompoundSelector";
import Edge from "@kernel/modules/Graphs/interfaces/Edge";

export default function ProcessMaterialUsageButton({
  variationId,
  processNodeId,
}: {
  variationId: string;
  processNodeId: string;
}) {
  const pointerModule = useModule<IPointerModule>("Pointer");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const graphModule = useModule<IGraphModule>("Graph");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { MaterialSelector, MaterialTypeSelector } = materialsModule.components;

  const { useGraph } = graphModule.hooks;
  const { useMaterials } = materialsModule.hooks;

  const materials = useMaterials();
  const variation = useVariation({ variationId });
  const graph = useGraph(variationId, (g) => g);
  const [newForm, setNewForm] = useState<{
    type?: string;
    materialId?: number;
    amount: CompoundValue;
  }>({
    type: undefined,
    materialId: undefined,
    amount: {
      quotient: { amount: 1, unit: "kilogramas6" },
      dividend: { amount: 1, unit: "unitario18" },
    },
  });

  const handleAddNewRecord = useCallback(() => {
    if (!graph.state) return;
    const materialNode = Object.values(graph.state.nodes).find(
      (n) =>
        n.type === "MATERIAL" &&
        (n as MaterialNode).materialId === newForm.materialId
    );
    if (!materialNode)
      throw Error("Material nao encontrado no modelo. Adicione-o antes");
    variation.actions.addProcessMaterialConsumption(
      processNodeId,
      materialNode.id,
      newForm.amount
    );
    setNewForm({
      type: undefined,
      materialId: undefined,
      amount: {
        quotient: { amount: 1, unit: "kilogramas6" },
        dividend: { amount: 1, unit: "unitario18" },
      },
    });
  }, [graph]);
  const graphMaterials = useMemo(
    () =>
      Object.values(graph.state?.nodes ?? {}).filter(
        (n): n is MaterialNode => n.type === "MATERIAL"
      ),
    [graph.state]
  );

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

  if (!graph.state) return null;

  return (
    <PointerContainer
      component={
        <Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <FormControl>
                <MaterialTypeSelector
                  filter={(t) =>
                    graphMaterials
                      .map((mn) => materials[mn.materialId].type)
                      .includes(t.name)
                  }
                  value={newForm.type}
                  onChange={(e) =>
                    setNewForm((curr) => ({ ...curr, type: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                {newForm.type && (
                  <MaterialSelector
                    type={newForm.type}
                    filter={(m) =>graphMaterials.map((mn) => mn.materialId).includes(m.id)}
                    value={newForm.materialId}
                    onChange={(v) =>
                      setNewForm((curr) => ({
                        ...curr,
                        materialId: v,
                      }))
                    }
                  />
                )}
              </FormControl>
            </Box>
            <FormControl>
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
            <Button onClick={handleAddNewRecord}>Adicionar</Button>
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
                  const material = materials[materialNode.materialId];
                  return (
                    <ListItem>
                      <FormControl>
                        <MaterialSelector
                          type={material.type}
                          value={material.id}
                          disabled
                        />
                      </FormControl>
                      <FormControl>
                        <CompoundSelector value={e.amount} onChange={(v)=>handleMaterialUsageUpdate(e, v)} />
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
                    </ListItem>
                  );
                })}
            </List>
          </Box>
        </Box>
      }
      actions={[<ConfirmAndCloseButton handleConfirm={console.log} />]}
    >
      <IconButton>
        <TableViewSharp color="secondary" />
      </IconButton>
    </PointerContainer>
  );
}
