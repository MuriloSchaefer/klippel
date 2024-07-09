import { useTheme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";

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

  const { useAppSelector } = storeModule.hooks;
  const { useNodeInfo, useGraph } = graphModule.hooks;
  const { useUnits, useConverter } = converterModule.hooks;
  const { useMaterials } = materialModule.hooks;
  const theme = useTheme();

  const { node } = useNodeInfo<OperationNode>(graphId, nodeId);
  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);
  const converter = useConverter();

  const { state: budget } = useComposition(
    { viewportName: activeViewport! },
    (c) => c?.budget
  );

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


  const timeRequired = useMemo(() => converter?.convert(
    node.time_taken,
    node.cost.dividend.unit,
    {
      unidades: Object.values(budget?.grades ?? {}).reduce(
        (acc, s) => acc + s,
        0
      ),
      pedidos: 1, // constant value
    }
  ) as UnitValue, [node.time_taken, node.cost, budget]);

  
  
  const totalCost = useMemo(() => {
    if (!units || !timeRequired) return 0;
    
    const context = {
      unidades: Object.values(budget?.grades ?? {}).reduce(
        (acc, s) => acc + s,
        0
      ),
      [units[timeRequired.unit].abbreviation]: timeRequired.amount,
      pedidos: 1, // constant value
    }


    return converter?.convert(
      node.cost,
      node.cost.quotient.unit,
      context
    ) as UnitValue
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
              alignItems: 'center',
              justifyContent: "space-between",
            }}
          >
            <Box sx={{width: 'max-content'}}><Typography>{node.label}</Typography></Box>
            <Box sx={{ display: "flex", justifyContent: "end", gap: 2 }}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: 'column',
                  maxWidth: "100px",
                  gap: 0.3,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><AccessTimeSharpIcon /> <span>Tempo</span></Box>
                <Box sx={{color: theme.palette.getContrastText(theme.palette.background.paper), opacity: '50%'
                }}>
                  <span>
                    {node.time_taken.quotient.amount}
                    {units[node.time_taken.quotient.unit].abbreviation}
                  </span>
                  <span>{" "}/{" "}</span>
                  <span>
                    {node.time_taken.dividend.amount}
                    {units[node.time_taken.dividend.unit].abbreviation}
                  </span>
                </Box>
                {budget && timeRequired && <Box sx={{color: theme.palette.primary.main}} >
                    {timeRequired.amount.toFixed(2)}{" "}
                    {units[timeRequired.unit].abbreviation}</Box>}
              </Box>


              <Box
                sx={{
                  display: "flex",
                  flexDirection: 'column',
                  maxWidth: "100px",
                  gap: 0.3,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <Box sx={{display: 'flex', alignItems: 'center', gap: 1}}><AttachMoneySharpIcon /> <span>Custo</span></Box>
                <Box sx={{color: theme.palette.getContrastText(theme.palette.background.paper), opacity: '50%'
                }}>
                  <span>
                    {node.cost.quotient.amount}
                    {units[node.cost.quotient.unit].abbreviation}
                  </span>
                  <span>{" "}/{" "}</span>
                  <span>
                  {node.cost.dividend.amount}
                  {units[node.cost.dividend.unit].abbreviation}
                  </span>
                </Box>
                {budget && totalCost && <Box sx={{color: theme.palette.primary.main}} >
                    {totalCost.amount.toFixed(2)}{" "}
                    {units[totalCost.unit].abbreviation}</Box>}
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
              role="material-attributes"
              aria-label="material attributes"
            ></Box>
            <Divider />
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
