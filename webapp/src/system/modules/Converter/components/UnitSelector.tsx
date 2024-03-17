import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import { ConversionGraph, NodeNScale, ScaleNode, UnitNode } from "../typings";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { useMemo } from "react";
import FormControl from "@mui/material/FormControl";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectProps } from "@mui/material/Select";

type UnitSelectorProps = SelectProps<string> & {
    value?: string
  filterUnits?: (unit: UnitNode, scale?: ScaleNode) => boolean;
};

export default ({ value, onChange, filterUnits = () => true, ...props }: UnitSelectorProps) => {
  const graphModule = useModule<IGraphModule>("Graph");

  const { useGraph } = graphModule.hooks;

  const storedState = useGraph<ConversionGraph, NodeNScale[]>(
    CONVERSION_GRAPH_NAME,
    (g) =>
      Object.values(g?.nodes ?? {})
        .filter((n): n is UnitNode => n.type === "UNIT")
        .map((node) => ({
          ...node,
          scale: Object.values(g?.nodes ?? {})
            .filter((n): n is ScaleNode => n.type === "SCALE")
            .find((s) =>
              g?.adjacencyList[node.id].outputs.includes(
                `${node.id} -> ${s.id}`
              )
            ),
        }))
  );

  const filteredUnits = useMemo(
    () =>
      storedState?.state?.filter((unit) => filterUnits(unit, unit.scale)) ?? [],
    [storedState.state, filterUnits]
  );

  return (
    <FormControl>
      <Select
        id="unit-selector"
        inputProps={{ id: "unit" }}
        size="small"
        sx={{ width: "max(min-content, 100px)", minWidth: 100 }}
        onChange={onChange}
        value={value}
        {...props}
      >
        {filteredUnits.map(({ id, name, abbreviation }) => (
          <MenuItem key={id} value={id}>
            {abbreviation}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
