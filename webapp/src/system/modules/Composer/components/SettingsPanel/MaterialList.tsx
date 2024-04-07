import { isEmpty } from "lodash";
import MUIAccordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreSharp from "@mui/icons-material/ExpandMoreSharp";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import type {Palette} from "@mui/material";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";

import useComposition from "../../hooks/useComposition";
import { MaterialNode } from "../../store/composition/state";

//  QUESTION: how to remove modules type dependencies?
import type { IMaterialsModule } from "@system/modules/Materials";
import type { MaterialType } from "@system/modules/Materials/store/materialTypes/state";
import type { MaterialState } from "@system/modules/Materials/store/materials/state";
import type { UnitValue } from "@system/modules/Converter/typings";


const Item = ({
  material,
  materialType,
}: {
  material: MaterialState;
  materialType: MaterialType;
}) => {
  const theme = useTheme();

  const { principal, extra } =
    materialType.schemas[materialType.latestSchema].selector;
  const name = material.attributes[principal];
  const secondary =
    extra === "cor"
      ? material.attributes[extra].label
      : material.attributes[extra];

  const matRequired: { [id: number]: UnitValue } = {
    7: { amount: 50, unit: "Kg" },
    8: { amount: 30, unit: "Kg" },
    9: { amount: 50, unit: "Kg" },
    12: { amount: 20, unit: "Kg" },
    14: { amount: 10, unit: "Kg" },
    17: { amount: 10, unit: "Kg" },
    18: { amount: 10, unit: "Kg" },
  };
  const stock: { [id: number]: UnitValue } = {
    7: { amount: 50, unit: "Kg" },
    8: { amount: 30, unit: "Kg" },
    9: { amount: 0, unit: "Kg" },
    12: { amount: 10, unit: "Kg" },
    14: { amount: 10, unit: "Kg" },
    17: { amount: 10, unit: "Kg" },
    18: { amount: 10, unit: "Kg" },
  };

  const stockStatus =
    stock[material.id].amount - matRequired[material.id].amount;
  let stockColor: keyof Palette = "error";

  if (material.id in stock && stock[material.id].amount > 0) {
    stockColor = stockStatus >= 0 ? "success" : "warning";
  }

  console.log(
    material.id,
    matRequired[material.id],
    stock[material.id],
    stockStatus,
    stockColor
  );

  return (
    <MUIAccordion
      sx={{
        width: "100%",
        display: "flex",
        flexGrow: 1,
        flexDirection: "column",
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreSharp />} sx={{ width: "100%" }}>
        <ListItem sx={{ padding: 0, width: "100%", flexGrow: 1 }}>
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
                  {matRequired[material.id].amount}{" "}
                  {matRequired[material.id].unit}
                </Typography>
                <Typography
                  variant="caption"
                  color={theme.palette[stockColor].main}
                >
                  ({stock[material.id].amount} {stock[material.id].unit} em
                  estoque)
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
};

export default () => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphsModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const { useAppSelector } = storeModule.hooks;
  const { useGraph } = graphsModule.hooks;
  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  const { selectActiveViewport } = layoutModule.store.selectors;
  const activeViewport = useAppSelector(selectActiveViewport);

  const composition = useComposition(
    { viewportName: activeViewport! },
    (c) => c
  );
  const materialNodes = useGraph(activeViewport!, (g) =>
    Object.values(g?.nodes ?? {})
      .filter((n): n is MaterialNode => n.type === "MATERIAL")
      .filter((n) =>
        Object.values(g?.edges ?? {}).find(
          (e) => e.type === "CONSUMES" && e.targetId === n.id
        )
      )
  );
  const materials = useMaterials(
    materialNodes.state?.map((n) => n.materialId) ?? []
  );
  const materialTypes = useMaterialTypes();
  console.log(materials, materialTypes);

  if (!materialNodes.state || !composition.state || !materials)
    return <>test</>; //TODO: add loading

  return (
    <List
      role="material-list"
      //sx={{ display: "flex", flexDirection: "column", gap: 1 }}
    >
      {materialNodes.state
        ?.sort((a, b) => a.type.localeCompare(b.type))
        .map((mat) => (
          <Item
            key={mat.id}
            material={materials[mat.materialId]}
            materialType={materialTypes[materials[mat.materialId].type]}
          />
        ))}
    </List>
  );
};
