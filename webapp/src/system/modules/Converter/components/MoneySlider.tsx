import React from "react";
import { Box, Typography, Slider, Grid } from "@mui/material";
import { UnitValue } from "../typings";
import { ScaleSliderProps } from "./ScaleSlider";

function valueLabelFormat(value: number) {
  const scaledValue = scaleValue(value);
  return `${scaledValue.amount} ${scaledValue.unit}`;
}

function scaleValue(value: number): UnitValue {
  const units = ["centavos", "R$"];

  let unitIndex = 0;
  let scaledValue = value;

  while (scaledValue >= 100 && unitIndex < units.length - 1) {
    unitIndex += 1;
    scaledValue /= 100;
  }
  return {
    amount: scaledValue,
    unit: units[unitIndex],
  };
}

function calculateValue(value: number) {
  if (value < 10000) {
    // cents scale
    return Math.round(Math.sqrt(value));
  }
  return +Math.pow(value / 1000, 2).toPrecision(2);
}

export default function MoneySlider({
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
      sx={{ width: 250 }}
      role="money-slider"
      onPointerMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Box>
        <Typography id="money-slider" gutterBottom>
          {label}: {valueLabelFormat(calculateValue(value))}
        </Typography>
        {slots?.coumpoundSelector}
      </Box>
      <Grid container spacing={2} alignItems="center">
        <Grid item>{icon}</Grid>
        <Grid item xs>
          <Slider
            value={value}
            min={0}
            step={0.01}
            max={100000}
            marks={[
              {
                value: 10000,
                label: "1 R$",
              },
              {
                value: 32000,
                label: "10 R$",
              },
            ]}
            scale={calculateValue}
            getAriaValueText={valueLabelFormat}
            valueLabelFormat={valueLabelFormat}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            aria-labelledby="money-slider"
          />
        </Grid>
      </Grid>
    </Box>
  );
}
