import { useMemo, useState } from "react";

import { type BoxProps } from "@mui/material/Box";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import Typography from "@mui/material/Typography";

import { IGraphModule } from "@kernel/modules/Graphs";
import useModule from "@kernel/hooks/useModule";

import {
  CompoundValue,
  ConversionGraph,
  NodeNScale,
  ScaleNode,
  UnitNode,
  UnitValue,
} from "../typings";
import UnitAmountSelector from "./UnitAmountSelector";
import { CONVERSION_GRAPH_NAME } from "../constants";
import { debounce } from "@kernel/utils";

interface CompoundSelectorProps extends Omit<BoxProps, "onChange"> {
  readonly label?: string;
  readonly value: CompoundValue;
  readonly onChange: (v: CompoundValue) => void;
  readonly filterQuotients?: (unit: UnitNode, scale?: ScaleNode) => boolean;
  readonly filterDividends?: (unit: UnitNode, scale?: ScaleNode) => boolean;
}

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

  const [currState, setCurrentState] = useState(value)
  const debouncedOnChange = useMemo(()=>debounce(onChange, 500), [])

  return (
    <Box
      component="div"
      role="compound-selector"
      sx={{ width: "min-content", display: "flex", gap: 1, alignItems: "baseline"}}
    >
      {label && <Typography gutterBottom sx={{minWidth: '50px'}}>{label}</Typography>}
      <Box sx={{ display: "flex", gap: 1, alignItems: "baseline"}}>
        <UnitAmountSelector
          key="quotient"
          id="quotient-selector"
          value={currState.quotient}
          onChange={(v: UnitValue) => {
            const updatedValue = { ...currState, quotient: v }
            setCurrentState(updatedValue)
            debouncedOnChange(updatedValue)
          }
          }
          selectorProps={{ sx: {width: '10px'} }}
        >
          {filteredQuotients.map(({ id, name, abbreviation }) => (
            <MenuItem key={id} value={id}>
              {abbreviation}
            </MenuItem>
          ))}
        </UnitAmountSelector>
        <span>/</span>
        <UnitAmountSelector
          key="dividend"
          id="dividend-selector"
          value={currState.dividend}
          onChange={(v: UnitValue) => {
            const updatedValue = { ...currState, dividend: v }
            setCurrentState(updatedValue)
            debouncedOnChange(updatedValue)
          }}
          sx={{width: 'max-content'}}
        >
          {filteredDividends.map(({ id, name, abbreviation }) => (
            <MenuItem key={id} value={id}>
              {abbreviation}
            </MenuItem>
          ))}
        </UnitAmountSelector>
      </Box>
    </Box>
  );
}
