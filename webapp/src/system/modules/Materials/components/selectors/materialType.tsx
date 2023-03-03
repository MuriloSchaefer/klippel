import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useCallback } from "react";
import { selectMaterialTypes } from "../../store/materialTypes/selectors";
import { MaterialType } from "../../store/materialTypes/state";

const MaterialTypeSelector = ({
    filter,
    value,
    onChange
}: {
    value?: string;
  filter?: (types: MaterialType) => boolean;
  onChange?: (value: string) => void;
}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialTypes = useAppSelector(selectMaterialTypes);
  console.log(materialTypes);

  const noFilter = useCallback((option: MaterialType) => true, []);

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
      <InputLabel id={`label`}>Tipo</InputLabel>
      <Select
        labelId={`label`}
        id={`material-type`}
        value={value}
        onChange={(e)=>{onChange && onChange(e.target.value)}}
        label="Tipo"
      >
        {Object.values(materialTypes)
          .filter(filter ?? noFilter)
          .map((type) => (
            <MenuItem value={type.name}>{type.label}</MenuItem>
          ))}

        {/* {availableOptions.map(option => {
                const label = interpreter.any(SELF(option.replace('_:#', '')), RDF('label'), undefined)
                return <MenuItem value={option}>{label?.value}</MenuItem>
            })} */}
      </Select>
    </FormControl>
  );
};

export default MaterialTypeSelector;
