import { createSlice } from "@reduxjs/toolkit";
import {
  materialsCatalogLoaded,
  materialTypeVersionRegistered,
} from "../materials/actions";
import { MaterialTypeSchema, MaterialTypesState } from "./state";

const slice = createSlice({
    name: 'materialTypesSlice',
    initialState: {} as MaterialTypesState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        materialsCatalogLoaded,
        (state: MaterialTypesState, { payload }) => {
          // Catalog snapshots carry `materialTypes` keyed by
          // `${name}@${version}` with the schema body as JSON. Merge
          // them into the renderer's `name → MaterialType` shape so a
          // peer can rehydrate types it didn't author locally (the
          // other side of `materialTypeVersionRegistered`'s optimistic
          // local update). Preserves existing fixture state — never
          // erases a type, only adds or advances `latestSchema`.
          const next: MaterialTypesState = { ...state };
          for (const entry of Object.values(payload.materialTypes ?? {})) {
            const [name, version] = entry.id.split("@");
            if (!name || !version) continue;
            let schema: MaterialTypeSchema;
            try {
              schema = JSON.parse(entry.schemaJson) as MaterialTypeSchema;
            } catch {
              continue;
            }
            const existing = next[name];
            // `latestSchema` advances if the incoming version is
            // numerically greater (lexicographic compare is fine for
            // the `x.y.z` patches used so far; revisit if non-numeric
            // segments are introduced).
            const latest =
              !existing?.latestSchema || version > existing.latestSchema
                ? version
                : existing.latestSchema;
            next[name] = {
              name,
              label: existing?.label ?? name,
              latestSchema: latest,
              schemas: {
                ...(existing?.schemas ?? {}),
                [version]: schema,
              },
            };
          }
          return next;
        },
      );
      builder.addCase(
        materialTypeVersionRegistered,
        (state: MaterialTypesState, { payload }) => {
          // Merge the new schema version into the existing type, or
          // create the type entry on first registration. `latestSchema`
          // moves forward to the just-registered version — callers
          // create new versions chronologically.
          let schema: MaterialTypeSchema;
          try {
            schema = JSON.parse(payload.schemaJson) as MaterialTypeSchema;
          } catch {
            return state;
          }
          const existing = state[payload.name];
          return {
            ...state,
            [payload.name]: {
              name: payload.name,
              label: existing?.label ?? payload.name,
              latestSchema: payload.version,
              schemas: {
                ...(existing?.schemas ?? {}),
                [payload.version]: schema,
              },
            },
          };
        },
      );
    }
})

export default slice;