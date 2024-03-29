import type { SelectChangeEvent } from "@mui/material";
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid";
import { MaterialType } from "../../store/materialTypes/state";
import MaterialTypeSelector from "./MaterialType";

export const  CRUDMaterialTypeCell = ({ id, field, value, multiple=false }: GridRenderEditCellParams & {multiple?: boolean}) => {
    const apiRef = useGridApiContext();
    const handleValueChange = (
      event: SelectChangeEvent<MaterialType>
    ) => {
      apiRef.current.setEditCellValue({
        id,
        field,
        value: event.target.value,
      });
    };

    return (
      <MaterialTypeSelector
        value={value}
        onChange={handleValueChange}
        multiple={multiple}
      />
    );
  }

export default CRUDMaterialTypeCell