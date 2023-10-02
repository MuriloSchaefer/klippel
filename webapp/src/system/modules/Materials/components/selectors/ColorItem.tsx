import { useTheme } from "@mui/material";
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
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
        gap: 1,
        justifyContent: "space-between",
      }}
    >
      <svg width={size} height={size} >
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
      <Typography>{color.label ?? color.id}</Typography>
    </Box>
  );
};

export default ColorItem;
