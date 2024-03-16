import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";

import type { IConverterModule } from "@system/modules/Converter";
import type { OperationNode } from "../../../store/composition/state";

const ProcessItem = ({
  graphId,
  nodeId,
}: {
  graphId: string;
  nodeId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const converterModule = useModule<IConverterModule>("Converter");
  const { useNodeInfo } = graphModule.hooks;
  const { useUnits } = converterModule.hooks;

  const { node } = useNodeInfo<OperationNode>(graphId, nodeId);
  const units = useUnits([
    node.cost.dividend.unit,
    node.cost.quotient.unit,
    node.time_taken.dividend.unit,
    node.time_taken.quotient.unit,
  ]);

  if (!units) return <></>; // TODO: add error handling

  return (
    <ListItem>
      <ListItemText
        disableTypography={true}
        primary={
          <Box sx={{ marginBottom: 1 }}>
            <Typography>{node.label}</Typography>
            <Divider />
          </Box>
        }
        secondary={
          <Typography component="div" sx={{ padding: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
              role="material-attributes"
              aria-label="material attributes"
            >
              <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
                <AccessTimeSharpIcon /> {node.time_taken.quotient.amount}{" "}
                {units[node.time_taken.quotient.unit].abbreviation} /{" "}
                {node.time_taken.dividend.amount}{" "}
                {units[node.time_taken.dividend.unit].abbreviation}
              </Box>
              <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
                <AttachMoneySharpIcon /> {node.cost.quotient.amount}{" "}
                {units[node.cost.quotient.unit].abbreviation} /{" "}
                {node.cost.dividend.amount}{" "}
                {units[node.cost.dividend.unit].abbreviation}
              </Box>
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default ProcessItem;
