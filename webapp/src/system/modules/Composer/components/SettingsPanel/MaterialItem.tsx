import useModule from "@kernel/hooks/useModule";

import MUIAccordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreSharp from "@mui/icons-material/ExpandMoreSharp";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material";
import type { ListItemProps, Palette } from "@mui/material";

import type { IConverterModule } from "@system/modules/Converter";
import { UnitNode, UnitValue } from "@system/modules/Converter/typings";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { MaterialType } from "@system/modules/Materials/store/materialTypes/state";
import { isEmpty } from "lodash";
import { IGraphModule } from "@kernel/modules/Graphs";
import {
  CompositionGraph,
  ConsumesEdge,
  MaterialNode,
} from "../../store/composition/state";
import { useMemo } from "react";

export default function Item({
  key,
  graphId,
  nodeId,
  quantity,
  material,
  materialType,
}: Readonly<{
  graphId: string;
  nodeId: string;
  quantity: number;
  material: MaterialState;
  materialType: MaterialType;
} & ListItemProps>) {
  const converterModule = useModule<IConverterModule>("Converter");
  const graphModule = useModule<IGraphModule>("Graph");
  const theme = useTheme();

  const { useGraph } = graphModule.hooks;
  const converter = converterModule.hooks.useConverter();

  const graphInfo = useGraph<
    CompositionGraph,
    { material: MaterialNode; consumptionEdges: ConsumesEdge[] }
  >(graphId, (g) => {
    const materialUsageEdges = Object.values(g?.edges ?? {})
      .filter(
        (e): e is ConsumesEdge => e.type == "CONSUMES" && e.targetId === nodeId
      )
      .map((e) => e.sourceId);
    const materialUsageNodes = Object.values(g?.nodes ?? {})
      .filter(
        (n) => n.type === "MATERIAL_USAGE" && materialUsageEdges.includes(n.id)
      )
      .map((n) => n.id);
    const consumptionEdges = Object.values(g?.edges ?? {}).filter(
      (e): e is ConsumesEdge =>
        e.type === "CONSUMES" && materialUsageNodes.includes(e.targetId)
    );

    return {
      material: g?.nodes[nodeId] as MaterialNode,
      consumptionEdges: consumptionEdges,
    };
  });

  const materialRequired = useMemo(() => {
    if (!graphInfo.state || !converter) return;

    // given all the consumption edges, calculate the total of material used, per unit
    return graphInfo.state?.consumptionEdges.reduce((acc, edge) => {
      const totalUnit = converter.convert(
        edge.quantity,
        material.stock.unit,
        {
          ...material.attributes,
          unidades: quantity, // used pt because conversion variables will use pt-br language
        }
      ) as UnitValue | undefined;

      if (!totalUnit) {
        //throw Error('could not calculate value')
        console.warn("could not convert");
        return acc;
      }

      return {...acc, amount: acc.amount + totalUnit.amount};
    }, {unit: material.stock.unit, amount: 0} as UnitValue);
  }, [graphInfo.state]);

  const { principal, extra } =
    materialType.schemas[materialType.latestSchema].selector;
  const name = material.attributes[principal];
  const secondary =
    extra === "cor"
      ? material.attributes[extra].label
      : material.attributes[extra];

  const stockStatus = material.stock.amount - (materialRequired?.amount ?? 0);
  let stockColor: keyof Palette = "error";
  if (material.stock.amount > 0) {
    stockColor = stockStatus >= 0 ? "success" : "warning";
  }

  const stockUnit = useMemo(()=>{
    if (!materialRequired?.unit || !converter?.state?.nodes) return undefined
    const node = converter.state.nodes[materialRequired.unit] as UnitNode
    return node
  }, [converter?.state?.nodes, materialRequired?.unit])

  return (
    <MUIAccordion
      sx={{
        width: "100%",
        display: "flex",
        flexGrow: 1,
        flexDirection: "column",
      }}
      key={key}
    >
      <AccordionSummary expandIcon={<ExpandMoreSharp />} sx={{ width: "100%" }}>
        <ListItem  sx={{ padding: 0, width: "100%", flexGrow: 1 }}>
          <Box
            role="summary"
            sx={{ display: "flex", flexDirection: "column", width: "100%" }}
          >
            <Box
              role="row1"
              sx={{
                display: "flex",
                gap: 2,
                width: "100%",
                alignItems: "center",
                flexGrow: 1,
                justifyContent: "space-between",
              }}
            >
              <Typography sx={{ width: "33%", flexShrink: 0, flexGrow: 1 }}>
                {materialType.label} - {name}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  gap: 0.5,
                  alignItems: "center",
                  justifyContent: "center",
                  maxWidth: "70%",
                  flexGrow: 1,
                }}
              >
                {extra === "cor" && (
                  <Box
                    role="color-preview"
                    sx={{
                      width: "1em",
                      height: "1em",
                      borderRadius: "50%",
                      border: `1px solid ${theme.palette.getContrastText(
                        theme.palette.background.paper
                      )}`,
                      backgroundColor: material.attributes[extra].hex,
                    }}
                  />
                )}
                <span>{secondary}</span>
              </Box>
            </Box>
            <Box
              role="row2"
              sx={{
                display: "flex",
                gap: 2,
                width: "100%",
                alignItems: "center",
                flexGrow: 1,
                justifyContent: "space-between",
              }}
            >
              <Typography
                variant="caption"
                sx={{ width: "33%", flexShrink: 0 }}
              >
                {material.industry}
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexGrow: 1,
                  flexDirection: "row",
                  gap: "3px",
                  justifyContent: "flex-end",
                }}
              >
                <Typography
                  variant="caption"
                  color={theme.palette.primary.dark}
                  sx={{ width: "fit-content", flexShrink: 0 }}
                >
                  {materialRequired && `${materialRequired.amount.toFixed(2)} ${stockUnit?.abbreviation}`}
                </Typography>
                <Typography
                  variant="caption"
                  color={theme.palette[stockColor].main}
                >
                  ({material.stock.amount} {stockUnit?.abbreviation} em estoque)
                </Typography>
              </Box>
            </Box>
          </Box>
        </ListItem>
      </AccordionSummary>
      <AccordionDetails
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <Box
            role="composition"
            sx={{
              display: "flex",
              border: `1px solid ${theme.palette.grey[600]}`,
              padding: 1,
              width: "50%",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <Typography variant="body1">Composição</Typography>
            {!isEmpty(material.composition) ? (
              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "space-around",
                }}
              >
                {Object.entries(material.composition).map(([key, value]) => (
                  <Box>
                    {value * 100}% {key}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>Nenhuma composição disponível</Typography>
            )}
          </Box>

          <Box
            role="caracteristics"
            sx={{
              display: "flex",
              border: `1px solid ${theme.palette.grey[600]}`,
              padding: 1,
              width: "50%",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "space-around",
            }}
          >
            <Typography variant="body1">Caracteristicas</Typography>
            {!isEmpty(material.caracteristics) ? (
              <Box
                sx={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "space-around",
                }}
              >
                {Object.entries(material.caracteristics).map(([key, value]) => (
                  <Box key={key}>
                    {key}: {value}
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography>Nenhuma caracterisca disponível</Typography>
            )}
          </Box>
        </Box>

        <Box
          role="actions"
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "row-reverse",
          }}
        >
          <Button variant="outlined">
            <Link href={material.externalURL} target="_blank" underline="none">
              Ver material
            </Link>
          </Button>
        </Box>
      </AccordionDetails>
    </MUIAccordion>
  );
}
