import { Box, useTheme } from "@mui/material";
import { Color } from "../../typings";

const ColorItem = ({
  color,
  previewSize,
}: {
  color: Color;
  previewSize?: number;
}) => {
  const theme = useTheme();
  const size = previewSize ?? 15;
  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <svg width={size} height={size} style={{ margin: "2px" }}>
        <circle
          r={size / 2}
          cx={size / 2}
          cy={size / 2}
          stroke={theme.palette.getContrastText(
            theme.palette.background.default
          )}
          strokeWidth={0.5}
          fill={color.hex}
        />
      </svg>
      {color.label ?? color.id}
    </Box>
  );
};

export default ColorItem;
