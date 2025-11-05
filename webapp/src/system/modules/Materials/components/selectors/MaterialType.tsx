import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import type { SelectProps } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useCallback } from "react";
import { selectMaterialTypes } from "../../store/materialTypes/selectors";
import { MaterialType } from "../../store/materialTypes/state";

type MaterialTypeSelectorProps = SelectProps<string> & {
  filter?: (type: MaterialType) => boolean;
}

const MaterialTypeSelector = ({
  filter,
  value,
  ...props
}: MaterialTypeSelectorProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialTypes = useAppSelector(selectMaterialTypes);

  const noFilter = useCallback((option: MaterialType) => true, []);

  return (
    <FormControl
      sx={{ m: 1, minWidth: 120, width: "min-content" }}
      fullWidth
      size="small"
    >
      <InputLabel id={`label`}>Tipo</InputLabel>
      <Select
        {...props}
        labelId={`label`}
        id={`material-type`}
        value={value ?? ""}
        label="Tipo"
      >
        {Object.values(materialTypes)
          .filter(filter ?? noFilter)
          .map((type) => (
            <MenuItem key={type.name} value={type.name}>
              {type.label}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};

type MaterialTypeMultiSelectorProps = SelectProps<string[]> & {
  filter?: (types: MaterialType) => boolean;
  label: string | React.ReactNode | undefined
}
export const MaterialTypeMultiSelector = ({
  filter,
  value,
  label,
  ...props
}: MaterialTypeMultiSelectorProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialTypes = useAppSelector(selectMaterialTypes);

  const noFilter = useCallback((option: MaterialType) => true, []);

  return (
    <FormControl
      sx={{ m: 1, minWidth: 120, width: "min-content" }}
      fullWidth
      size="small"
    >
      {label && <InputLabel id={`label`}>{label}</InputLabel>}
      <Select
        {...props}
        multiple
        labelId={`label`}
        id={`material-type`}
        value={value ?? []}
        label="Tipo"
      >
        {Object.values(materialTypes)
          .filter(filter ?? noFilter)
          .map((type) => (
            <MenuItem key={type.name} value={type.name}>
              {type.label}
            </MenuItem>
          ))}
      </Select>
    </FormControl>
  );
};

export default MaterialTypeSelector;
