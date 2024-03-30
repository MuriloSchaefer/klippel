import { useCallback } from "react";

import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";

import { CONVERSION_GRAPH_NAME } from "../../../constants";
import { ConvertsToEdge } from "../../../typings";
import useConverterManager from "../../../hooks/useConverterManager";


type ConversionListProps = {
  unitId: string;
  type?: "inputs" | "outputs";
};

export default ({ unitId, type = "outputs" }: ConversionListProps) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;

  const edges = useGraph(CONVERSION_GRAPH_NAME, (g) => {
    if (!g) return [];
    const outputs = g.adjacencyList[unitId].outputs
      .filter((o) => g.edges[o].type === "CONVERTS_TO")
      .map((o) => g.edges[o]);
    const inputs = g.adjacencyList[unitId].inputs
      .filter((o) => g.edges[o].type === "CONVERTS_TO")
      .map((o) => g.edges[o]);

    if (type === "inputs") return inputs as ConvertsToEdge[];
    return outputs as ConvertsToEdge[];
  });
  const converter = useConverterManager((c) => c);

  const handleDelete = useCallback((id: string) => {
    converter.removeConversion(id);
  }, []);

  return (
    <>
      {edges.state?.map((e) => (
        <Paper
          key={e.targetId}
          variant="outlined"
          square
          sx={{
            width: "100%",
            padding: 1,
            "&:div + div": {
              borderTop: 0,
            },
            display: "flex",
          }}
          role="conversion-container"
        >
          <ListItem role="conversion-info">
            <ListItemText
              disableTypography={true}
              primary={
                <Box sx={{ marginBottom: 1 }}>
                  <Typography>{e.id}</Typography>
                  <Divider />
                </Box>
              }
              secondary={
                <Typography component="div">
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <Box
                      sx={{
                        gap: 1,
                        display: "flex",
                        flexWrap: "wrap",
                        flexDirection: "row",
                      }}
                      role="material-attributes"
                      aria-label="material attributes"
                    >
                      {e.conversionType === "expression"
                        ? e.expression
                        : `1:${e.factor}`}
                    </Box>
                  </Box>
                </Typography>
              }
            />
          </ListItem>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
              justifyContent: "space-around",
              alignContent: "space-evenly",
            }}
            role="actions"
          >
            <IconButton
              color="error"
              key="delete"
              id={`delete-conversion-${e.id}`}
              onClick={() => handleDelete(e.id)}
              sx={{ flexGrow: 2 }}
            >
              <DeleteForeverSharpIcon />
            </IconButton>
          </Box>
        </Paper>
      ))}
    </>
  );
};
