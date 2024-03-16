import { BoxProps } from "@mui/material";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";
import {
  CompoundValue,
  ConversionGraph,
  ScaleNode,
  UnitNode,
  UnitValue,
} from "../typings";
import UnitSelector from "./UnitSelector";
import { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { useMemo } from "react";

interface CompoundSelectorProps extends Omit<BoxProps, "onChange"> {
  readonly label?: string;
  readonly value: CompoundValue;
  readonly onChange: (v: CompoundValue) => void;
  readonly filterQuotients?: (unit: UnitNode, scale?: ScaleNode) => boolean;
  readonly filterDividends?: (unit: UnitNode, scale?: ScaleNode) => boolean;
}

type NodeNScale = UnitNode & {
  scale?: ScaleNode;
};

export default function CompoundSelector({
  label,
  value,
  onChange,
  filterQuotients = () => true,
  filterDividends = () => true,
}: CompoundSelectorProps) {
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

  const filteredQuotients = useMemo(
    () =>
      storedState?.state?.filter((unit) => filterQuotients(unit, unit.scale)) ??
      [],
    [storedState.state, filterQuotients]
  );
  const filteredDividends = useMemo(
    () =>
      storedState?.state?.filter((unit) => filterDividends(unit, unit.scale)) ??
      [],
    [storedState.state, filterQuotients]
  );

  return (
    <Box
      role="compound-selector"
      width={"min-content"}
      sx={{ display: "flex", gap: 1, alignItems: "baseline"}}
    >
      {label && <Typography gutterBottom sx={{minWidth: '50px'}}>{label}</Typography>}
      <Box sx={{ display: "flex", gap: 1, alignItems: "baseline"}}>
        <UnitSelector
          key="quotient"
          id="quotient-selector"
          value={value.quotient}
          onChange={(v: UnitValue) => onChange({ ...value, quotient: v })}
          selectorProps={{ sx: {width: '10px'} }}
        >
          {filteredQuotients.map(({ id, name, abbreviation }) => (
            <MenuItem key={id} value={id}>
              {abbreviation}
            </MenuItem>
          ))}
        </UnitSelector>
        <span>/</span>
        <UnitSelector
          key="dividend"
          id="dividend-selector"
          value={value.dividend}
          onChange={(v: UnitValue) => onChange({ ...value, dividend: v })}
          sx={{width: 'max-content'}}
        >
          {filteredDividends.map(({ id, name, abbreviation }) => (
            <MenuItem key={id} value={id}>
              {abbreviation}
            </MenuItem>
          ))}
        </UnitSelector>
      </Box>
    </Box>
  );
}
