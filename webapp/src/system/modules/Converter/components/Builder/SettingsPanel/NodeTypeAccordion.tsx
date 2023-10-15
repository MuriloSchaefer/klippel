import { useCallback } from "react";
import _ from "lodash";

import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";

import { CONVERSION_GRAPH_NAME } from "../../../constants";
import {
  CompoundNode,
  ConversionGraph,
  ScaleNode,
  UnitNode,
} from "../../../typings";

const NODE_TYPES = [
  {
    type: "UNIT",
    label: "Unidade",
    description: "Adiciona um tipo de unidade simples",
  },
  {
    type: "COMPOUND_UNIT",
    label: "Unidade composta",
    description: "Adiciona um tipo de unidade composta",
  },
  {
    type: "SCALE",
    label: "Escala",
    description: "Adiciona um tipo de escala",
  },
];

export default () => {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;
  const graph = useGraph<ConversionGraph>(
    CONVERSION_GRAPH_NAME,
    (g) => g as ConversionGraph
  );

  const handleClick = useCallback((type: string) => {
    switch (type) {
      case "UNIT":
        graph.actions.addNode({
          type: "UNIT",
          id: _.uniqueId(type.toLowerCase()),
          name: `Nova unidade`,
          position: { x: 0, y: 0 },
          abbreviation: "new-unit",
        } as UnitNode);
        break;
      case "SCALE":
        graph.actions.addNode({
          type: "SCALE",
          id: _.uniqueId(type.toLowerCase()),
          name: `Nova escala`,
          position: { x: 0, y: 0 },
        } as ScaleNode);
        break;
      case "COMPOUND_UNIT":
        graph.actions.addNode({
          type: "COMPOUND_UNIT",
          id: _.uniqueId(type.toLowerCase()),
          name: `Nova unidade composta`,
          abbreviation: "new-compound-unit",
          position: { x: 0, y: 0 },
        } as CompoundNode);
        break;
    }
  }, [graph]);

  if (!graph.state) return <></> // TODO: add loading

  return (
    <List
      role="list-options"
      sx={{
        paddingRight: 5,
        overflow: "auto",
      }}
    >
      {NODE_TYPES.map(({ type, label, description }) => (
        <ListItem key={type} disableGutters>
          <ListItemText
            primary={label}
            secondary={description}
            onClick={() => handleClick(type)}
            sx={{
              cursor: "pointer",
              flexGrow: 1,
            }}
          />
        </ListItem>
      ))}
    </List>
  );
};
