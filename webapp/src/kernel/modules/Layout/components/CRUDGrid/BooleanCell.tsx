import { Switch } from "@mui/material";
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid";

export default function CRUDBooleanCell({id, value, field}: GridRenderEditCellParams) {
    const apiRef = useGridApiContext();
    const handleValueChange = (event: React.ChangeEvent<any>) => {
      const newValue = event.target.checked; // The new value entered by the user
      apiRef.current.setEditCellValue({ id, field, value: newValue });
    };
    return <Switch checked={value} onChange={handleValueChange} />;
  }