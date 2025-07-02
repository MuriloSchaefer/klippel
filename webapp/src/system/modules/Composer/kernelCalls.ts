import { StartModuleProps } from "@kernel/modules/base";
import React from "react";
import ModelSection from "./components/ModelSection";
import middlewares from "./store/models/middlewares";
import { saveSession } from "./store/models/actions";
import { MODULE_NAME } from "./constants";
import slice from "./store/slice";
import ModelViewport from "./components/viewports/ModelViewport";

export function startModule({
  managers: { storeManager, componentRegistryManager, ribbonMenuManager },
  storage,
}: StartModuleProps) {
  // configure session saver
  const store = storeManager.functions.getStore();
  storage.registerSessionSaveListener(
    store
      ? () => store.dispatch(saveSession())
      : () => console.log("Missing store. skipping session save!")
  );

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer)
  storeManager.functions.registerMiddleware(middlewares);
  // storeManager.functions.registerMiddleware(graphMiddlewares)

  componentRegistryManager.functions.registerComponents({
    ribbonMenuSections: {
      ModelSelector: React.memo(ModelSection),
    },
      viewportTypes: {
        // Composer: React.memo(Composerviewport),
        // DebuggerViewport: DebuggerViewport
        ModelViewport: ModelViewport
      }
  });
  ribbonMenuManager.functions.addNewTab({
    label: "Compositor",
    sectionNames: ["ModelSelector"],
    type: "base",
  });

  //storeManager.functions.registerMiddleware(middleware)
}
