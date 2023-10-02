import {
  Box,
  BoxProps,
  FormControl,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import { UnitValue } from "../typings";

export interface UnitSelectorProps extends Omit<BoxProps, "onChange"> {
  value: UnitValue;
  onChange: (v: UnitValue) => void;
  children: React.ReactNode | React.ReactNode[];
}

export default function UnitSelector({
  onChange,
  value,
  children,
  ...props
}: UnitSelectorProps) {
  return (
    <Box role="unit-selector" {...props} sx={{ display: "flex", gap: 0.2 }}>
      <FormControl>
        <TextField
          id="amount"
          size="small"
          type="number"
          autoComplete="off"
          sx={{ width: "min-content", minWidth: 80 }}
          value={value.amount}
          onChange={(evt: React.ChangeEvent<HTMLInputElement>) =>
            onChange({ unit: value.unit, amount: evt.target.valueAsNumber })
          }
        />
      </FormControl>
      <FormControl>
        <Select
          id="unit-selector"
          inputProps={{ id: "unit" }}
          size="small"
          sx={{ width: "min-content" }}
          onChange={(evt: SelectChangeEvent<string>) =>
            onChange({ amount: value.amount, unit: evt.target.value })
          }
          value={value.unit}
        >
          {children}
          {/* <MenuItem value={"un"}>Un</MenuItem> */}
        </Select>
      </FormControl>
    </Box>
  );
}
