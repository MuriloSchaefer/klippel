import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  List,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import useVariation from "../../../hooks/useVariation";
import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { IPointerModule } from "@kernel/modules/Pointer";
import React, { useMemo, useState } from "react";
import { debounce } from "@kernel/utils";
import { IConverterModule } from "@system/modules/Converter";
import { CompoundValue } from "@system/modules/Converter/typings";
import {
  DeleteOutlineSharp,
  AttachMoneySharp,
  AccessTimeSharp,
  EditSharp,
} from "@mui/icons-material";
import { ConsumesEdge, MaterialNode, ProcessNode } from "../../../typings";
import { NodesHashMap } from "@kernel/modules/Graphs/store/state";
import { IMaterialsModule } from "@system/modules/Materials";
import ProcessEditButton from "./ProcessEditButton";
import ProcessMaterialUsageButton from "./processMaterialUsageButton";

function ProcessItem({
  variationId,
  nodeId,
}: {
  variationId: string;
  nodeId: string;
}) {
  const graphModule = useModule<IGraphModule>("Graph");
  const converterModule = useModule<IConverterModule>("Converter");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const { useUnits } = converterModule.hooks;
  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  const graph = graphModule.hooks.useGraph(variationId, (g) => g);
  const node = useMemo(
    () => graph.state?.nodes[nodeId] as ProcessNode,
    [graph.state]
  );
  const units = useUnits();
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  const materialsConsumptions = useMemo(
    () =>
      Object.values(graph.state?.edges ?? {}).filter(
        (e): e is ConsumesEdge => e.type === "CONSUMES" && e.sourceId === nodeId
      ),
    [graph.state?.edges]
  );
  if (!graph.state || !units) return null;
  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Typography sx={{ fontWeight: "bold" }}>{node.label}</Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <AttachMoneySharp />
              <Typography>
                {node.costTime?.quotient.amount}{" "}
                {units![node.costTime!.quotient.unit].abbreviation} /
                {node.costTime?.dividend.amount}{" "}
                {units![node.costTime!.dividend.unit].abbreviation}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <AccessTimeSharp />
              <Typography>
                {node.costMoney?.quotient.amount}{" "}
                {units![node.costMoney!.quotient.unit].abbreviation} /
                {node.costMoney?.dividend.amount}{" "}
                {units![node.costMoney!.dividend.unit].abbreviation}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{display:'flex', flexGrow: 1, alignItems: 'center'}}>
          <Box
          sx={{
            display: "flex",
            gap: 1,
            overflowY: "hidden",
            overflowX: "auto",
          }}
        >
          {materialsConsumptions.map((mc) => {
            const mat =
              materials[
                (graph.state!.nodes[mc.targetId] as MaterialNode).materialId
              ];
            const matType = materialTypes[mat.type];
            const schema = matType.schemas[mat.schemaVersion];
            const extraAttr = mat.attributes[schema.selector.extra];

            return (
              <Chip
                sx={{
                  height: "auto",
                  "& .MuiChip-label": {
                    display: "block",
                    whiteSpace: "normal",
                  },
                  p: 1,
                }}
                label={
                  <Box>
                    <Typography>
                      {mat.attributes[schema.selector.principal]} (
                      {schema.attributes[schema.selector.extra] === "color"
                        ? extraAttr.label
                        : extraAttr}
                      )
                    </Typography>
                    <Typography>
                      {mc.amount.quotient.amount}{" "}
                      {units![mc.amount.quotient.unit].abbreviation} /
                      {mc.amount.dividend.amount}{" "}
                      {units![mc.amount.dividend.unit].abbreviation}
                    </Typography>
                  </Box>
                }
              />
            );
          })}
        </Box>
        </Box>
        
      </Box>
      <Box
        id={`process-${nodeId}-actions`}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        <IconButton>
          <DeleteOutlineSharp color="error" />
        </IconButton>
        <ProcessEditButton variationId={variationId} processNode={node} />
        <ProcessMaterialUsageButton
          variationId={variationId}
          processNodeId={node.id}
        />
      </Box>
      <Divider />
    </Box>
  );
}

function NewProcessButton({ variationId }: { variationId: string }) {
  const converterModule = useModule<IConverterModule>("Converter");
  const pointerModule = useModule<IPointerModule>("Pointer");
  const graphModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const { PointerContainer, ConfirmAndCloseButton } = pointerModule.components;
  const { CompoundSelector } = converterModule.components;

  const { useGraph } = graphModule.hooks;
  const { useMaterials } = materialsModule.hooks;

  const [form, setForm] = useState<{
    name: string;
    costTime: CompoundValue;
    costMoney: CompoundValue;
    materialCosts: { materialNodeId: string; amount: CompoundValue }[];
  }>({
    name: "",
    costTime: {
      quotient: { amount: 1, unit: "unitario18" },
      dividend: { amount: 1, unit: "minutos249" },
    },
    costMoney: {
      quotient: { amount: 1, unit: "reais11" },
      dividend: { amount: 1, unit: "unitario18" },
    },
    materialCosts: [],
  });
  const variation = useVariation({ variationId });
  const graph = useGraph(variationId, (g) => g);

  const materialNodes = useMemo(() => {
    return Object.values(graph.state!.nodes).reduce(
      (acc, curr) =>
        curr.type === "MATERIAL"
          ? { ...acc, [curr.id]: curr as MaterialNode }
          : acc,
      {} as NodesHashMap<MaterialNode>
    );
  }, [graph.state]);

  const materials = useMaterials(
    Object.values(materialNodes).map((mn) => mn.materialId)
  );

  const debouncedChange = debounce((e: React.ChangeEvent<any>) => {
    setForm((curr) => ({ ...curr, name: e.target.value }));
  }, 300);

  return (
    <PointerContainer
      component={
        <Box
          id="new-process-form"
          sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1 }}
        >
          <TextField
            label="Nome"
            id="new-process-name"
            onChange={debouncedChange}
            size="small"
            sx={{ width: "100%", flexGrow: 1 }}
          />
          <Box>
            <Box>
              <Typography>Tempo necessário</Typography>
              <CompoundSelector
                filterDividends={(u, s) => s?.id === "temporal247"}
                filterQuotients={(u, s) => u.id === "unitario18"}
                value={form.costTime}
                onChange={(v) => setForm((curr) => ({ ...curr, costTime: v }))}
              />
            </Box>

            <Box>
              <Typography>Dinheiro necessário (mão de obra)</Typography>
              <CompoundSelector
                filterQuotients={(u, s) => s?.id === "monetaria10"}
                filterDividends={(u, s) =>
                  u.id === "unitario18" || s?.id === "temporal247"
                }
                value={form.costMoney}
                onChange={(v) => setForm((curr) => ({ ...curr, costMoney: v }))}
              />
            </Box>
          </Box>
        </Box>
      }
      actions={[
        <ConfirmAndCloseButton
          handleConfirm={() => {
            variation.actions.addProcess(form);
          }}
        />,
      ]}
    >
      <Button variant="outlined">Adicionar Processo</Button>
    </PointerContainer>
  );
}

export default function ProcessListAccordion({
  variationId,
  parentId,
}: Readonly<{ variationId: string; parentId: string }>) {
  const graphModule = useModule<IGraphModule>("Graph");

  const theme = useTheme();
  const variation = useVariation({ variationId });

  const processNodes = graphModule.hooks.useGraph(variationId, (g) =>
    Object.values(g?.nodes ?? {}).filter((n) => n.type === "PROCESS")
  );

  if (!processNodes.state) {
    return <>Nenhum processo adicionado</>;
  }

  return (
    <Box>
      <NewProcessButton variationId={variationId} />
      <List
        sx={{
          "& > div:nth-child(2n+1)": {
            // Selects every even child (2nd, 4th, etc.)
            borderBottom: '1px solid rgba(0,0,0,0.5)',
            backgroundColor: theme.palette.action.hover, // A slightly darker color from the theme
          },
          "& > div:last-child": {
            borderBottom: undefined
          }
        }}
      >
        {processNodes.state.map((process) => (
          <ProcessItem
            key={process.id}
            variationId={variationId}
            nodeId={process.id}
          />
        ))}
      </List>
    </Box>
  );
}
