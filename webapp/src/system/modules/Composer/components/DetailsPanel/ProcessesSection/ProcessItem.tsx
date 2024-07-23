import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";
import TextField  from "@mui/material/TextField";
import FunctionsSharpIcon from '@mui/icons-material/FunctionsSharp';

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { NodesHashMap } from "@kernel/modules/Graphs/store/state";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import type { IConverterModule } from "@system/modules/Converter";
import type { UnitValue } from "@system/modules/Converter/typings";

import type {
  CompositionGraph,
  ConsumesEdge,
  MaterialUsageNode,
  OperationNode,
} from "../../../store/composition/state";
import useComposition from "../../../hooks/useComposition";
import { IMaterialsModule } from "@system/modules/Materials";
import { useMemo } from "react";

const ProcessItem = ({
  graphId,
  nodeId,
}: {
  graphId: string;
  nodeId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const converterModule = useModule<IConverterModule>("Converter");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const materialModule = useModule<IMaterialsModule>("Materials");

  const { CompoundSelector } = converterModule.components;

  const { useAppSelector } = storeModule.hooks;
  const { useNodeInfo, useGraph } = graphModule.hooks;
  const { useUnits, useConverter } = converterModule.hooks;
  const { useMaterials } = materialModule.hooks;
  const theme = useTheme();

  const { node } = useNodeInfo<OperationNode>(graphId, nodeId);
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);
  const converter = useConverter();

  const {
    state: budget,
    actions: { updateOperation },
  } = useComposition({ viewportName: activeViewport! }, (c) => c?.budget);

  const { state: usageEdges } = useGraph<
    CompositionGraph,
    {
      nodes: NodesHashMap<MaterialUsageNode>;
      edges: Array<ConsumesEdge & { total?: UnitValue }>;
    }
  >(
    graphId,
    (g) =>
      g?.edges && {
        nodes: Object.values(g.nodes)
          .filter((n) =>
            Object.values(g.edges)
              .filter(
                (edge): edge is ConsumesEdge =>
                  edge.type === "CONSUMES" && edge.sourceId === nodeId
              )
              .map((e) => e.targetId)
              .includes(n.id)
          )
          .reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
        edges: Object.values(g.edges)
          .filter(
            (edge): edge is ConsumesEdge =>
              edge.type === "CONSUMES" && edge.sourceId === nodeId
          )
          .map((e) => ({
            ...e,
            total: converter?.convert(e.quantity, e.quantity.quotient.unit, {
              unidades: Object.values(budget?.grades ?? {}).reduce(
                (acc, s) => acc + s,
                0
              ),
              pedidos: 1, // constant value
            }) as UnitValue,
          })),
      }
  );

  const units = useUnits([
    node.cost.dividend.unit,
    node.cost.quotient.unit,
    node.time_taken.dividend.unit,
    node.time_taken.quotient.unit,
    ...(usageEdges?.edges ?? []).reduce(
      (acc, e) => [...acc, e.quantity.quotient.unit, e.quantity.dividend.unit],
      [] as string[]
    ),
  ]);

  const timeRequired = useMemo(
    () =>
      {
        if (!units) return 0;

        const timeValue = converter?.convert(node.time_taken, node.time_taken.quotient.unit, {
          unidades: Object.values(budget?.grades ?? {}).reduce(
            (acc, s) => acc + s,
            0
          ),
          pedidos: 1, 
        }) as UnitValue

        const unitValue = units[node.cost.dividend.unit].abbreviation === 'h' ? converter?.convert(timeValue, node.cost.dividend.unit, {
          unidades: Object.values(budget?.grades ?? {}).reduce(
            (acc, s) => acc + s,
            0
          ),

          [units[timeValue.unit].abbreviation]: timeValue.amount,
          pedidos: 1, 
        }) as UnitValue : undefined


        return {
          timeRequired: timeValue,
          costDividendUnit: unitValue
        }
      },
    [node.time_taken, node.cost, budget]
  );

  const totalCost = useMemo(() => {
    if (!units || !timeRequired) return 0;

    const context = {
      unidades: Object.values(budget?.grades ?? {}).reduce(
        (acc, s) => acc + s,
        0
      ),
      [units[timeRequired.costDividendUnit!.unit].abbreviation]: timeRequired.costDividendUnit!.amount,
      pedidos: 1, 
    };

    return converter?.convert(
      node.cost,
      node.cost.quotient.unit,
      context
    ) as UnitValue;
  }, [node.cost, units, timeRequired, budget]);

  const materials = useMaterials(
    Object.values(usageEdges?.nodes ?? {}).map(
      (n) => +n.materialId.split("-")[1]
    )
  );

  if (!units) return <></>; // TODO: add error handling

  return (
    <ListItem>
      <ListItemText
        disableTypography={true}
        primary={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2
            }}
          >
            <Box sx={{ flexGrow: 1}}>
              <Typography>
                <TextField
                  id="name"
                  label="Nome"
                  variant="standard"
                  sx={{ width: '100%' }}
                  onChange={(evt) =>
                    updateOperation?.(node.id, { label: evt.target.value })
                  }
                  value={node.label}
                />
              </Typography>
            </Box>
            <Box sx={{ display: "flex", justifyContent: "end", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "100px",
                  gap: 0.3,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {budget && timeRequired && (
                  <Box sx={{ color: theme.palette.primary.main }}>
                    {timeRequired.amount.toFixed(2)}{" "}
                    {units[timeRequired.unit].abbreviation}
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxWidth: "100px",
                  gap: 0.3,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {budget && totalCost && (
                  <Box sx={{ color: theme.palette.primary.main }}>
                    {totalCost.amount.toFixed(2)}{" "}
                    {units[totalCost.unit].abbreviation}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        }
        secondary={
          <Typography
            component="div"
            sx={{
              padding: 1,
              display: "flex",
              gap: 1,
              flexDirection: "column",
            }}
          >
            <Divider />
            <Typography variant="h6" color={theme.palette.primary.main}>
              Info
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AccessTimeSharpIcon />{" "}
              <CompoundSelector
                id="time-taken"
                label="Tempo"
                filterDividends={(unit) => unit.abbreviation === "un"}
                filterQuotients={(_, scale) => scale?.name === "Temporal"}
                value={node.time_taken}
                onChange={(v) => updateOperation?.(node.id, { time_taken: v })}
              />
              <FunctionsSharpIcon />
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <AttachMoneySharpIcon />{" "}
              <CompoundSelector
                id="cost"
                label="Custo"
                filterDividends={(unit, scale) =>
                  unit.abbreviation === "un" || scale?.name == "Temporal"
                }
                filterQuotients={(_, scale) => scale?.name === "Monetaria"}
                value={node.cost}
                onChange={(v) => updateOperation?.(node.id, { cost: v })}
              />
              <FunctionsSharpIcon sx={{color: theme.palette.secondary.main}}/>
            </Box>
            <Divider />
            <Typography variant="h6" color={theme.palette.primary.main}>
              Materials
            </Typography>
            <Box>
              {usageEdges?.edges.map((e) => (
                <Box
                  key={e.id}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>
                    {
                      materials[
                        +usageEdges.nodes[e.targetId].materialId.split("-")[1]
                      ].attributes["nome"]
                    }{" "}
                  </span>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Box>
                      {e.quantity.quotient.amount}{" "}
                      {units[e.quantity.quotient.unit].abbreviation} /{" "}
                      {e.quantity.dividend.amount}{" "}
                      {units[e.quantity.dividend.unit].abbreviation}
                    </Box>
                    {budget && e.total !== undefined && (
                      <>
                        <span>=</span>
                        <Box color={theme.palette.primary.main}>
                          {e.total.amount.toFixed(2)}{" "}
                          {units[e.total.unit].abbreviation}
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default ProcessItem;
