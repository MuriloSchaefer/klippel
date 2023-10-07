import {
  BoxProps,
} from "@mui/material";
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import { CompoundValue, UnitValue } from "../typings";
import UnitSelector from "./UnitSelector";

interface CompoundSelectorProps extends Omit<BoxProps, "onChange"> {
  quotientUnitsAvailable: () => { value: string; label: string }[];
  dividendUnitsAvailable: () => { value: string; label: string }[];
  label?: string;
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
      width={'min-content'}
      sx={{ display: "flex", gap: 2, alignItems: "baseline" }}
    >
      {label && <Typography gutterBottom>{label}</Typography>}
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
