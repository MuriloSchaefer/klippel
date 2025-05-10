import React from "react";
import { StartModuleProps } from "@kernel/modules/base";
import slice, { sessionSaver } from "./store/slice";
import { MODULE_NAME } from "./constants";
import ConverterGraphViewport from "./components/Builder/ConverterGraphViewport";
import ConversorGraphSection from "./components/ribbonMenu/ConversorGraphSection";
import { loadConversionGraph } from "./store/actions";
import middlewares from "./store/middlewares";

export function startModule({
  dispatch,
  managers: { storeManager, componentRegistryManager, ribbonMenuManager },
  storage,
}: StartModuleProps) {
  // configure session saver
  const store = storeManager.functions.getStore();
  storage.registerSessionSaveListener(
    store
      ? sessionSaver(store)
      : () => console.log("Missing store. skipping session save!")
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(middlewares);
  // storeManager.functions.registerMiddleware(materialsMiddlewares)

  dispatch(loadConversionGraph());
  // dispatch(loadMaterials({}))

  componentRegistryManager.functions.registerComponents({
    ribbonMenuSections: {
      ConversorGraphSection: React.memo(ConversorGraphSection),
    },
    viewportTypes: {
      ConverterGraphViewport: ConverterGraphViewport,
    },
  });

  ribbonMenuManager.functions.addNewTab({
    label: "Conversor",
    sectionNames: ["ConversorGraphSection"],
    type: "base",
  });

}
