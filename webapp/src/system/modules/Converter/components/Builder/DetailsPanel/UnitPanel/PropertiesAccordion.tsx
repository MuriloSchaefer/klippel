import SettingsIcon from "@mui/icons-material/Settings";
import SaveSharpIcon from "@mui/icons-material/SaveSharp";
import RotateLeftSharpIcon from "@mui/icons-material/RotateLeftSharp";

import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import ScaleSelector from "../../../ScaleSelector";
import { useCallback, useEffect, useState } from "react";
import { IGraphModule } from "@kernel/modules/Graphs";

import useConverterManager from "../../../../hooks/useConverterManager";
import { CONVERSION_GRAPH_NAME } from "../../../../constants";
import { ConversionGraph, UnitNode } from "../../../../typings";
import { IconButton, TextField } from "@mui/material";

type PropertiesState = UnitNode & { scale?: string };

export type PropertiesAccordionProps = {
  initialState: PropertiesState;
};

const PropertiesAccordion = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { Accordion } = layoutModule.components;

  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;

  const manager = useConverterManager((s) => s.selectedNode);
  const storedState = useGraph<ConversionGraph, PropertiesState>(
    CONVERSION_GRAPH_NAME,
    (g) =>
      manager.state && g?.nodes
        ? {
            ...(g.nodes[manager.state] as UnitNode),
            scale: g.adjacencyList[manager.state].outputs
              .filter((o) => g.edges[o].type === "BELONGS_TO")
              .map((o) => g.edges[o].targetId)
              .pop(),
          }
        : undefined
  );
  const [properties, setProperties] = useState<PropertiesState | undefined>(
    storedState.state
  );
  useEffect(()=> setProperties(storedState.state), [manager.state])

  const saveProperties = useCallback(() => {
    manager.updateUnit(
      manager.state!,
      properties?.name!,
      properties?.abbreviation!,
      properties?.scale
    );
  }, [storedState]);

  if (!manager?.state || !storedState?.state) return <></>; // TODO: add error handling
  return (
    <Accordion
      name="Propriedades"
      icon={<SettingsIcon />}
      summary={`Propriedades da unidade`}
    >
      <Paper
        variant="outlined"
        square
        sx={{
          width: "100%",
          padding: 1,
          "&:div + div": {
            borderTop: 0,
          },
          display: "flex",
          justifyContent: "space-between",
        }}
        role="unit-properties"
      >
        <TextField
            id="unit-name"
            label="Nome"
            variant="standard"
            value={properties?.name ?? ""}
            onChange={(v) =>
              setProperties((curr) => curr && ({ ...curr, name: v.target.value }))
            }
          />
          <TextField
            id="abbreviation"
            label="Abreviatura"
            variant="standard"
            value={properties?.abbreviation ?? ""}
            onChange={(v) =>
              setProperties((curr) => curr && ({ ...curr, abbreviation: v.target.value }))
            }
            sx={{ alignItems: "center" }}
          />
        <ScaleSelector
          value={properties?.scale ?? ""}
          onChange={(v) =>
            setProperties((curr) => curr && { ...curr, scale: v })
          }
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            padding: 0,
            gap: 1,
            justifyContent: "space-between",
            alignContent: "space-evenly",
          }}
          role="actions"
        >
          <IconButton
            color="success"
            key="save"
            id="save-unit-properties"
            onClick={(e) => saveProperties()}
          >
            <SaveSharpIcon />
          </IconButton>
          <IconButton
            color="info"
            key="reset"
            id="reset-unit-properties"
            onClick={(e) => setProperties(storedState.state)}
          >
            <RotateLeftSharpIcon />
          </IconButton>
        </Box>
      </Paper>
    </Accordion>
  );
};

export default PropertiesAccordion;
