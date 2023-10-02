import {
  Box,
  BoxProps,
  MenuItem,
  Typography,
} from "@mui/material";
import { CompoundValue, UnitValue } from "../typings";
import UnitSelector from "./UnitSelector";

interface CompoundSelectorProps extends Omit<BoxProps, "onChange"> {
  quotientUnitsAvailable: () => { value: string; label: string }[];
  dividendUnitsAvailable: () => { value: string; label: string }[];
  label: string;
  value: CompoundValue;
  onChange: (v: CompoundValue) => void;
}

export default function CompoundSelector({
  quotientUnitsAvailable,
  dividendUnitsAvailable,
  label,
  value,
  onChange,
}: CompoundSelectorProps) {

  return (
    <Box
      role="compound-selector"
      sx={{ display: "flex", gap: 2, alignItems: "baseline" }}
    >
      <Typography gutterBottom>{label}</Typography>
      <UnitSelector
        key="quotient"
        id="quotient-selector"
        value={value.quotient}
        onChange={(v: UnitValue) => onChange({ ...value, quotient: v })}
      >
        {quotientUnitsAvailable().map(({ value, label }) => (
          <MenuItem key={value} value={value}>{label}</MenuItem>
        ))}
      </UnitSelector>
      <span>/</span>
      <UnitSelector
        key="dividend"
        id="dividend-selector"
        value={value.dividend}
        onChange={(v: UnitValue) => onChange({ ...value, dividend: v })}
      >
        {dividendUnitsAvailable().map(({ value, label }) => (
          <MenuItem key={value} value={value}>{label}</MenuItem>
        ))}
      </UnitSelector>
    </Box>
  );
}
