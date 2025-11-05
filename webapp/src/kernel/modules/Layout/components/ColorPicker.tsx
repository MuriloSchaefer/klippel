import { useState } from "react";

import Box from "@mui/material/Box";
import type { ButtonProps } from "@mui/material/Button";

const Dialog = (props: any) => {
  return (
    <Box sx={{ position: "absolute" }}>
      {/* <TwitterPicker {...props} /> */}
    </Box>
  );
};

export default function ColorPicker(
  {colorChange,sx}: ButtonProps & { colorChange: any}
) {
  const [color, setColor] = useState("#ffffff");
  const [showDialog, setShowDialog] = useState(false);
  return (
    <Box sx={{ position: "relative" }}>
      <Box
        sx={{
          ...sx,
          borderRadius: 1,
          backgroundColor: color,
          minWidth: '10px',
          minHeight: '10px'
        }}
        onClick={() => setShowDialog((curr) => !curr)}
      />
      {showDialog && (
        <Dialog
          onChange={(color, evt) => {
            setColor(color.hex);
            setShowDialog(false);
            colorChange?.(color, evt);
          }}
        />
      )}
    </Box>
  );
}
