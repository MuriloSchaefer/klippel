import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  ListSubheader,
  Box,
  SelectChangeEvent,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { selectMaterials } from "../../store/materials/selectors";
import { MaterialsState, MaterialState } from "../../store/materials/state";
import { selectMaterialType } from "../../store/materialTypes/selectors";
import ColorItem from "./ColorItem";

const MaterialSelector = ({
  type,
  value,
  filter,
  onChange,
}: {
  type: string;
  value: number;
  filter?: (option: MaterialState) => boolean;
  onChange?: (value: number) => void;
}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const materialType = useAppSelector(selectMaterialType(type));
  const selector = materialType.schemas[materialType.latestSchema].selector;

  const noFilter = useCallback((option: MaterialState) => true, []);
  const materials = useAppSelector(
    selectMaterials((materials) =>
      Object.values(materials)
        .filter((mat) => mat.type === type)
        .filter(filter ?? noFilter)
        .reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {})
    )
  );

  // adapt entries to be able to split into 2 selectors.
  // all entries are grouped per industry and external Id
  // This operation will be done in the backend eventually
  const groupedMaterials = Object.values(materials).reduce((acc, curr) => {
    if (acc[curr.industry]) {
      if (acc[curr.industry][curr.externalId])
        return {
          ...acc,
          [curr.industry]: {
            ...acc[curr.industry],
            [curr.externalId]: {
              ...acc[curr.industry][curr.externalId],
              extra: [...acc[curr.industry][curr.externalId].extra, curr],
            },
          },
        };
      else
        return {
          ...acc,
          [curr.industry]: {
            ...acc[curr.industry],
            [curr.externalId]: {
              label: curr.attributes[selector.principal],
              extra: [curr],
            },
          },
        };
    }
    return {
      ...acc,
      [curr.industry]: {
        [curr.externalId]: {
          label: curr.attributes[selector.principal],
          extra: [curr],
        },
      },
    };
  }, {} as { [industry: string]: { [externalId: string]: { label: string; extra: MaterialState[] } } });

  const [selectedMaterial, setSelectedMaterial] = useState(
    Object.values(materials).find((mat) => mat.id === value)
  );
  const [principalState, setPrincipalState] = useState(
    selectedMaterial
      ? `${selectedMaterial?.industry}-${selectedMaterial?.externalId}`
      : undefined
  );
  
  const handleMaterialSelection = useCallback((e: SelectChangeEvent<number>)=> {
    if (typeof e.target.value === 'string') return
    setSelectedMaterial(Object.values(materials).find((mat) => mat.id === e.target.value))
    if (onChange) onChange(e.target.value)
  }, [materials])

  return (
    <Box
      sx={{ width: "100%", display: "flex", justifyContent: "space-between" }}
    >
      <FormControl sx={{ m: 1, width: "100%" }} fullWidth size="small">
        <InputLabel id={`label`} sx={{ textTransform: "capitalize" }}>
          {selector.principal}
        </InputLabel>
        <Select
          labelId={`label`}
          id={`material-name`}
          value={principalState}
          onChange={(e) => setPrincipalState(e.target.value)}
          label={selector.principal}
        >
          {Object.entries(groupedMaterials).map(([industry, materials]) => {
            return [
              <ListSubheader>{industry}</ListSubheader>,
              ...Object.entries(materials).map(([externalId, materials]) => (
                <MenuItem key={externalId} value={`${industry}-${externalId}`}>
                  {materials.label}
                </MenuItem>
              )),
            ];
          })}
        </Select>
      </FormControl>
      <FormControl sx={{ m: 1, minWidth: 120, width: 'fit-content' }} size="small">
        <InputLabel id={`label`} sx={{ textTransform: "capitalize" }}>
          {selector.extra}
        </InputLabel>
        <Select
          labelId={`label`}
          id={`material-extra`}
          value={selectedMaterial?.id}
          onChange={handleMaterialSelection}
          label={selector.extra}
        >
          { // TODO: improve conditionals
            principalState &&
            principalState.split("-")[0] in groupedMaterials &&
            principalState.split("-")[1] in
              groupedMaterials[principalState.split("-")[0]] &&
            groupedMaterials[principalState.split("-")[0]][
              principalState.split("-")[1]
            ].extra.map((material) => (
              <MenuItem key={material.id} value={material.id}>
                {selector.extra === "cor" ? (
                  <ColorItem
                    color={material.attributes[selector.extra]}
                  ></ColorItem>
                ) : (
                  <>{material.attributes[selector.extra]}</>
                )}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </Box>
  );
};

export default MaterialSelector;
