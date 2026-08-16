import { useCallback, useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectProps } from "@mui/material/Select";
import ListSubheader from "@mui/material/ListSubheader";
import { SelectChangeEvent } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import {
  selectMaterial,
  selectMaterialsByType,
} from "../../store/materials/selectors";
import { loadMaterialsOfType } from "../../store/materials/actions";
import { MaterialState } from "../../store/materials/state";
import { selectMaterialType } from "../../store/materialTypes/selectors";
import { resolveTypeSchema } from "../../store/materialTypes/resolveTypeSchema";
import ColorItem from "./ColorItem";

const MaterialSelector = ({
  type,
  value,
  filter,
  onChange,
  disabled = false
}: {
  type: string;
  value?: string;
  filter?: (option: MaterialState) => boolean;
  onChange?: (value: string) => void;
  disabled?: boolean
}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const dispatch = storeModule.hooks.useAppDispatch();

  // The renderer mirrors a page of the catalog, not the catalog, so "every
  // material of this type" is not answerable from Redux until the type has
  // been pulled in. Ask on mount; the middleware de-duplicates across the
  // many pickers that mount together and no-ops once the type is resident.
  useEffect(() => {
    if (type) dispatch(loadMaterialsOfType({ type }));
  }, [dispatch, type]);

  const materialType = useAppSelector(selectMaterialType(type));

  // Two stages on purpose. The type projection is a Redux selector cached on
  // `type` (a stable string), so it recomputes only when the catalog changes.
  // `filter` is typically an inline lambda from the parent — folding it into
  // the selector, as this did before, rebuilt the selector on every render and
  // defeated its memo, re-projecting the whole catalog each time.
  const ofType = useAppSelector(selectMaterialsByType(type));
  const materials = useMemo(
    () => (filter ? ofType.filter(filter) : ofType),
    [ofType, filter],
  );

  // A type can legitimately be absent: on a first-ever workspace open there is
  // no `.session/Materials/materialTypes` cache to rehydrate from, so the slice
  // is empty until `materialsCatalogLoaded` resolves — and a peer can sync a
  // material ahead of its type (see `resolveTypeSchema`). Render nothing rather
  // than asserting; the selector re-renders as soon as the type lands.
  // The early return has to wait until every hook below has run, so the schema
  // stays optional all the way down instead of bailing out here.
  const selector = resolveTypeSchema(materialType)?.selector;

  // adapt entries to be able to split into 2 selectors.
  // all entries are grouped per industry and external Id
  // This operation will be done in the backend eventually
  const groupedMaterials: {
    [industry: string]: {
      [externalId: string]: { label: string; extra: MaterialState[] };
    };
  } = useMemo(() => {
    // Built by mutating a local accumulator. The previous spread-per-item
    // reduce allocated a fresh copy of the whole tree for every material —
    // O(k²), measured at 148 ms for a single type's rows in a 10k catalog.
    // The result is freshly created here and never handed back to Redux, so
    // mutating it while building is not observable.
    const groups: {
      [industry: string]: {
        [externalId: string]: { label: string; extra: MaterialState[] };
      };
    } = {};
    if (!selector) return groups;
    for (const material of materials) {
      const byExternalId = (groups[material.industry] ||= {});
      const group = byExternalId[material.externalId];
      if (group) group.extra.push(material);
      else
        byExternalId[material.externalId] = {
          label: material.attributes[selector.principal],
          extra: [material],
        };
    }
    return groups;
  }, [materials, selector]);

  // O(1) against the catalog rather than a scan of this type's rows. Still
  // gated on type + `filter` so a `value` outside the offered set clears the
  // picker, exactly as the old `Object.values(materials).find` did.
  const materialById = useAppSelector(selectMaterial(value ?? ""));
  const selectedMaterial =
    materialById &&
    materialById.type === type &&
    (!filter || filter(materialById))
      ? materialById
      : undefined;
  const [principalState, setPrincipalState] = useState(
    selectedMaterial
      ? `${selectedMaterial?.industry}-${selectedMaterial?.externalId}`
      : undefined
  );

  const handleMaterialSelection = useCallback(
    (e: SelectChangeEvent<string>) => {
      if (onChange) onChange(e.target.value);
    },
    [onChange]
  );

  // Type not resolved yet (cold open with no cache, or a material synced ahead
  // of its type) — there is no schema to drive the two pickers from, and this
  // re-renders the moment the type lands.
  if (!selector) return null;

  return (
    <Box
      sx={{ width: "100%", display: "flex", justifyContent: "space-between" }}
    >
      <FormControl
        data-testid="material-selector-principal"
        sx={{ m: 1, width: "100%" }}
        fullWidth
        size="small"
      >
        <InputLabel id={`label`} sx={{ textTransform: "capitalize" }}>
          {selector.principal}
        </InputLabel>
        <Select
          labelId={`label`}
          id={`material-name`}
          value={principalState ?? ""}
          onChange={(e) => setPrincipalState(e.target.value)}
          label={selector.principal}
          disabled={disabled}
          sx={{minWidth: 120}}
        >
          {Object.entries(groupedMaterials).map(([industry, materials]) => {
            return [
              <ListSubheader>{industry}</ListSubheader>,
              ...Object.entries(materials).map(([externalId, group]) => {
                const principalKey = `${industry}-${externalId}`;
                const ids = group.extra.map((m) => m.id).join(",");
                return (
                  <MenuItem
                    key={externalId}
                    value={principalKey}
                    data-principal-key={principalKey}
                    data-material-ids={ids}
                  >
                    {group.label}
                  </MenuItem>
                );
              }),
            ];
          })}
        </Select>
      </FormControl>
      <FormControl
        data-testid="material-selector-extra"
        sx={{ m: 1, minWidth: 120, width: "fit-content" }}
        size="small"
      >
        <InputLabel id={`label`} sx={{ textTransform: "capitalize" }}>
          {selector.extra}
        </InputLabel>
        <Select<string>
          labelId={`label`}
          id={`material-extra`}
          value={selectedMaterial?.id ?? ""}
          onChange={handleMaterialSelection}
          label={selector.extra}
          disabled={disabled}
        >
          {
            // TODO: improve conditionals
            principalState &&
              principalState.split("-")[0] in groupedMaterials &&
              principalState.split("-")[1] in
                groupedMaterials[principalState.split("-")[0]] &&
              groupedMaterials[principalState.split("-")[0]][
                principalState.split("-")[1]
              ].extra.map((material) => (
                <MenuItem
                  key={material.id}
                  value={material.id}
                  data-material-id={material.id}
                >
                  {selector.extra === "cor" ? (
                    <ColorItem
                      color={material.attributes[selector.extra]}
                    ></ColorItem>
                  ) : (
                    <>{material.attributes[selector.extra]}</>
                  )}
                </MenuItem>
              ))
          }
        </Select>
      </FormControl>
    </Box>
  );
};

export default MaterialSelector;
