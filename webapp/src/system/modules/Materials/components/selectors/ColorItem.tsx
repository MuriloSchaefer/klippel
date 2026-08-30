import { useTheme } from "@mui/material/styles";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Color } from "../../typings";

/**
 * `color` is optional because the catalog cannot guarantee it. A type whose
 * selector names `cor` as the distinguishing attribute may still hold rows
 * that never got one — imported before the attribute existed, or written by a
 * migration that left it blank. Those rows are malformed, but a malformed row
 * must not take the picker down with it (it did: `color.hex` on `undefined`).
 * Render the gap instead, so the row stays selectable and the missing value is
 * visible to whoever has to fix it.
 */
const ColorItem = ({
  color,
  previewSize,
}: {
  color?: Color;
  previewSize?: number;
}) => {
  const theme = useTheme();
  const size = previewSize ?? 15;
  const contorno = theme.palette.getContrastText(
    theme.palette.background.default,
  );

  if (!color) {
    return (
      <Box
        sx={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          gap: 1,
          justifyContent: "space-between",
        }}
      >
        <svg width={size} height={size}>
          {/* Círculo vazado: lê como "sem cor", não como uma cor escura. */}
          <circle
            r={size / 2 - 0.5}
            cx={size / 2}
            cy={size / 2}
            stroke={contorno}
            strokeWidth={0.5}
            strokeDasharray="2 2"
            fill="none"
          />
        </svg>
        <Typography sx={{ fontStyle: "italic", color: "text.secondary" }}>
          sem cor
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 1,
        justifyContent: "space-between",
      }}
    >
      <svg width={size} height={size} >
        <circle
          r={size / 2}
          cx={size / 2}
          cy={size / 2}
          stroke={contorno}
          strokeWidth={0.5}
          fill={color.hex}
        />
      </svg>
      <Typography>{color.label ?? color.id}</Typography>
    </Box>
  );
};

export default ColorItem;
