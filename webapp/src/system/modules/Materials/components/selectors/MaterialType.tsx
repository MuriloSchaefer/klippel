import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import type { SelectChangeEvent, SelectProps } from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import { useCallback } from "react";
import { selectMaterialTypes } from "../../store/materialTypes/selectors";
import { MaterialType } from "../../store/materialTypes/state";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

type MaterialTypeSelectorProps = Omit<SelectProps<string>, "onChange"> & {
  filter?: (type: MaterialType) => boolean;
  onChange?: (event: SelectChangeEvent<string>, child: React.ReactNode) => void;
}

const MaterialTypeSelector = ({
  filter,
  value,
  onChange,
  labelId,
  id,
  name,
  required,
  label,
}: MaterialTypeSelectorProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialTypes = useAppSelector(selectMaterialTypes);

  const noFilter = useCallback((_option: MaterialType) => true, []);

  return (
    <FormControl
      sx={{ m: 1, minWidth: 120, width: "100%" }}
      fullWidth
      size="small"
    >
      <Autocomplete<MaterialType>
        disablePortal
        autoSelect
        autoComplete
        fullWidth
        size="small"
        options={Object.values(materialTypes ?? {}).filter(filter ?? noFilter)}
        getOptionKey={(option) => option.name}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, current) => option.name === current.name}
        id={id ?? "material-type-selector"}
        value={value && materialTypes ? materialTypes[value] ?? null : null}
        onChange={(event, selected) => {
          const nextValue = selected?.name ?? "";
          const syntheticEvent = {
            ...event,
            target: { value: nextValue, name: name ?? "" },
          } as unknown as SelectChangeEvent<string>;
          onChange?.(syntheticEvent, null);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            name={name}
            required={required}
            label={label ?? "Tipo"}
            slotProps={{
              ...params.slotProps,
              htmlInput: {
                ...(params.slotProps?.htmlInput ?? {}),
                "aria-labelledby": labelId,
              },
            }}
          />
        )}
      />
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
        {Object.values(materialTypes ?? {})
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
