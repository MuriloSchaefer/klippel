import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import {
  selectMaterialsWindow,
  selectWindowedMaterials,
} from "../store/window/selectors";
import type { MaterialState } from "../store/materials/state";
import type { MaterialsWindowState } from "../store/window/state";

/**
 * The catalog page the renderer currently mirrors, plus the counts describing
 * how much of the catalog it represents.
 *
 * This replaces `useFilteredMaterials` for the stock grid. The difference is
 * where the filtering happens: that hook scored every material in Redux,
 * which only works while Redux holds every material. It holds a page now, so
 * the query goes to main and this hook renders the answer.
 */
export interface CatalogWindowView extends MaterialsWindowState {
  /** The page's rows, in the order main ranked them. */
  materials: MaterialState[];
}

export default function useCatalogWindow(): CatalogWindowView {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const window = useAppSelector(selectMaterialsWindow);
  const materials = useAppSelector(selectWindowedMaterials);

  return { ...window, materials };
}
