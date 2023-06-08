import React from "react";
import { Box, Typography, Slider, Grid } from "@mui/material";
import { UnitValue } from "../typings";

function valueLabelFormat(value: number) {
  

  const scaledValue = scaleValue(value)

  return `${scaledValue.amount} ${scaledValue.unit}`;
}

function scaleValue(value: number): UnitValue {
  const units = ["s", "m", "h", "d"];
  const factors = [1, 60, 3600, 86400];

  const found = factors.findIndex(f => f >= value)
  const unitIndex = Math.max(found < 0 ? 3 : found-1, 0)
  let scaledValue = Math.round(value / factors[unitIndex]); //86400

  return {
    amount: scaledValue,
    unit: units[unitIndex]
  }
}

function calculateValue(value: number) {
  const chunk = 108000
  let newValue = value
  if (value < chunk ) newValue = value/120
  else if (value < 2*chunk ) newValue = value/240
  else if (value > 3*chunk ) newValue = value
  console.log(value, chunk, newValue)
  return newValue
}

export default function TimeSlider({
  label,
  icon,
  onChange
}: {
  label: string;
  icon: any;
  onChange: (newValue: UnitValue) => void;
}) {
  const [value, setValue] = React.useState(10);

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    if (typeof newValue === "number") {
      setValue(newValue);
      onChange(scaleValue(calculateValue(newValue)))
    }
    event.stopPropagation();
    event.preventDefault();
  };

  return (
    <Box
      sx={{ width: 250 }}
      onPointerMove={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <Typography id="time-slider" gutterBottom>
        {label}: {valueLabelFormat(calculateValue(value))}
      </Typography>
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
