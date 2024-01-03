import Box, { BoxProps } from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { ConversionGraph, ScaleNode } from "../typings";

export interface UnitSelectorProps extends Omit<BoxProps, "onChange"> {
  value: string;
  onChange: (v: string) => void;
  //children: React.ReactNode | React.ReactNode[];
}

export default function ScaleSelector({
  onChange,
  value,
  //children,
  ...props
}: UnitSelectorProps) {
  const graphModule = useModule<IGraphModule>("Graph");

  const {
    hooks: { useGraph },
  } = graphModule;

  const scales = useGraph<ConversionGraph, ScaleNode[]>(
    CONVERSION_GRAPH_NAME,
    (g) =>
      g &&
      (Object.values(g.nodes).filter((n) => n.type === "SCALE") as ScaleNode[])
  );

  if (!scales.state) return <></>; // TODO: add loading

  return (
    <Box role="scale-selector" {...props} sx={{ display: "flex", gap: 0.2 }}>
      <FormControl
      sx={{ m: 1, minWidth: 120, width: "min-content" }}>
        <InputLabel id={`label`}>Escala</InputLabel>
        <Select
          id="scale-selector"
          inputProps={{ id: "scale" }}
          label="Escala"
          labelId="label"
          size="small"
          onChange={(evt: SelectChangeEvent<string>) =>
            onChange(evt.target.value)
          }
          value = {value ?? ""}
        >
          {scales.state.map((scale) => (
            <MenuItem value={scale.id}>{scale.name}</MenuItem>
          ))}
          <MenuItem value={""}>Nenhuma</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}
