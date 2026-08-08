import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Paper from "@mui/material/Paper";
import type { ButtonProps } from "@mui/material/Button";

/**
 * Preset swatches, kept deliberately small and high-contrast: these are used to
 * tint viewport tab groups, where a handful of distinguishable colours beats a
 * continuous gradient. The native input below covers anything else.
 */
export const COLOR_PICKER_PRESETS = [
  "#1976d2",
  "#2e7d32",
  "#ed6c02",
  "#d32f2f",
  "#7b1fa2",
  "#0288d1",
  "#5d4037",
  "#455a64",
];

export type ColorPickerProps = ButtonProps & {
  colorChange: (color: { hex: string }) => void;
  /** Controlled value. Falls back to internal state when omitted. */
  value?: string;
};

export default function ColorPicker({
  colorChange,
  sx,
  value,
}: ColorPickerProps) {
  const [color, setColor] = useState(value ?? COLOR_PICKER_PRESETS[0]);
  const [showDialog, setShowDialog] = useState(false);

  useEffect(() => {
    if (value) setColor(value);
  }, [value]);

  const pick = (hex: string) => {
    setColor(hex);
    setShowDialog(false);
    colorChange?.({ hex });
  };

  return (
    <ClickAwayListener onClickAway={() => setShowDialog(false)}>
      <Box sx={{ position: "relative" }}>
        <Box
          role="button"
          tabIndex={0}
          aria-label="color-picker"
          data-testid="color-picker"
          data-color={color}
          sx={{
            ...sx,
            borderRadius: 1,
            backgroundColor: color,
            minWidth: "10px",
            minHeight: "10px",
            cursor: "pointer",
          }}
          onClick={() => setShowDialog((curr) => !curr)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowDialog((curr) => !curr);
            }
          }}
        />
        {showDialog && (
          <Paper
            elevation={4}
            role="color-picker-dialog"
            data-testid="color-picker-dialog"
            sx={{
              position: "absolute",
              zIndex: 2,
              mt: 0.5,
              p: 1,
              display: "grid",
              gridTemplateColumns: "repeat(4, 24px)",
              gap: 0.5,
            }}
          >
            {COLOR_PICKER_PRESETS.map((preset) => (
              <Box
                key={preset}
                role="button"
                tabIndex={0}
                aria-label={`color-${preset}`}
                data-testid={`color-swatch-${preset}`}
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: "2px",
                  backgroundColor: preset,
                  cursor: "pointer",
                  outline: preset === color ? "2px solid" : "none",
                  outlineColor: "text.primary",
                }}
                onClick={() => pick(preset)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    pick(preset);
                  }
                }}
              />
            ))}
            <Box
              component="input"
              type="color"
              aria-label="color-custom"
              data-testid="color-custom"
              value={color}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                pick(e.target.value)
              }
              sx={{
                gridColumn: "1 / -1",
                width: "100%",
                height: 24,
                p: 0,
                border: "none",
                background: "none",
                cursor: "pointer",
              }}
            />
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
