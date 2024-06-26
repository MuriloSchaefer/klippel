import TextField, { TextFieldProps } from "@mui/material/TextField";
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid";
import React from "react";

export default function CRUDTextFieldCell({
  id,
  value,
  field,
  ...props
}: Omit<TextFieldProps, "id"> & GridRenderEditCellParams) {
  const apiRef = useGridApiContext();
  const handleValueChange = (event: React.ChangeEvent<any>) => {
    const newValue = event.target.value; // The new value entered by the user
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };
  return (
      <TextField
        value={value ?? ""}
        onChange={handleValueChange}
        sx={{ padding: 0 }}
        {...props}
      />
  );
}
