import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import Select, { SelectProps } from "@mui/material/Select";

import TextField, { TextFieldProps } from "@mui/material/TextField";
import type { BoxProps, SelectChangeEvent } from "@mui/material";

import type { UnitValue } from "../typings";

export interface UnitSelectorProps extends Omit<BoxProps, "onChange"> {
  value: UnitValue;
  onChange: (v: UnitValue) => void;
  selectorProps?: SelectProps;
  textFieldProps?: TextFieldProps;
  children: React.ReactNode | React.ReactNode[];
}

export default function UnitAmountSelector({
  onChange,
  value,
  children,
  selectorProps = { sx: {} },
  textFieldProps = { sx: {} },
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
          sx={{ ...selectorProps.sx, width: "100px", minWidth: 80 }}
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
          sx={{ ...textFieldProps.sx, width: "max(min-content, 100px)", minWidth: 100 }}
          onChange={(evt: SelectChangeEvent<string>) =>
            onChange({ amount: value.amount, unit: evt.target.value })
          }
          value={value.unit}
        >
          {children}
        </Select>
      </FormControl>
    </Box>
  );
}
