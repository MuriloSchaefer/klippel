import React from "react";

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Slider from '@mui/material/Slider';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import { UnitValue } from "../typings";
import { ScaleSliderProps } from "./ScaleSlider";

function valueLabelFormat(value: number) {
  const scaledValue = scaleValue(value);

  return `${scaledValue.amount} ${scaledValue.unit}`;
}

function scaleValue(value: number): UnitValue {
  const units = ["s", "m", "h", "d"];
  const factors = [1, 60, 3600, 86400];

  const found = factors.findIndex((f) => f >= value);
  const unitIndex = Math.max(found < 0 ? 3 : found - 1, 0);
  let scaledValue = Math.round(value / factors[unitIndex]); //86400

  return {
    amount: scaledValue,
    unit: units[unitIndex],
  };
}

function calculateValue(value: number) {
  const chunk = 108000;
  let newValue = value;
  if (value < chunk) newValue = value / 120;
  else if (value < 2 * chunk) newValue = value / 240;
  else if (value > 3 * chunk) newValue = value;
  return newValue;
}

export default function TimeSlider({
  label,
  icon,
  onChange,
  slots,
}: Omit<ScaleSliderProps, "scale">) {
  const [value, setValue] = React.useState(10);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") {
      setValue(newValue);
      onChange(scaleValue(calculateValue(newValue)));
    }
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <Box
      sx={{ width: 'min-content' }}
      onPointerMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* <TextField
          id="quotient-number"
          size="small"
          label={label}
          type="number"
          InputLabelProps={{
            shrink: true,
          }}
          value={valueLabelFormat(calculateValue(value))}
        /> */}
        <>
          <TextField
            id="quotient-number"
            size="small"
            type="number"
            sx={{minWidth:80}}
            InputLabelProps={{
              shrink: true,
            }}
            value={100}
          />
          <Select
            id="quotient-unit-selector"
            size="small"
            sx={{ width: "min-content" }}
          >
            <MenuItem value={"week"}>Sem.</MenuItem>
            <MenuItem value={"day"}>Dia</MenuItem>
            <MenuItem value={"h"}>Hr</MenuItem>
            <MenuItem value={"m"}>min</MenuItem>
            <MenuItem value={"s"}>sec</MenuItem>
          </Select>
        </>
        <span>/</span>
        {slots?.coumpoundSelector}
      </Box>

      <Grid container spacing={2} alignItems="center">
        <Grid item>{icon}</Grid>
        <Grid item xs>
          <Slider
            value={value}
            min={0}
            step={10} // 10 seconds
            max={432000} // 30 days in seconds
            marks={[]}
            scale={calculateValue}
            getAriaValueText={valueLabelFormat}
            valueLabelFormat={valueLabelFormat}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            aria-labelledby="time-slider"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
