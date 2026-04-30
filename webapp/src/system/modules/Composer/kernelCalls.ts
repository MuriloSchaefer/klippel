import { PostBootInitializationProps, StartModuleProps } from "@kernel/modules/base";
import React from "react";
import ModelSection from "./components/ModelSection";
import modelsMiddlewares from "./store/models/middlewares";
import variationMiddlewares from "./store/variations/middlewares";
import computationMiddlewares from "./store/computation/middlewares";
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
  storeManager.functions.registerMiddleware(modelsMiddlewares);
  storeManager.functions.registerMiddleware(variationMiddlewares);
  storeManager.functions.registerMiddleware(computationMiddlewares);
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


export function postBootInitialization({managers:{keyboardManager}}: PostBootInitializationProps) {
  keyboardManager.functions.registerShortcuts([
    {
      id: `${MODULE_NAME}/ModelSection/createModel`,
      key: 'q',
      contextId: `${MODULE_NAME}/ModelSection`,
      action: () => document.getElementById("new-model-form")?.click(),
      description: 'Create a new model',
      enabled: true,
    },{
      id: `${MODULE_NAME}/ModelSection/openModel`,
      key: 'w',
      contextId: `${MODULE_NAME}/ModelSection`,
      action: () => document.getElementById("open-model-modal")?.click(),
      description: 'Open an existing model',
      enabled: true,
    }
  ], {context: 'RibbonMenu'})

  keyboardManager.functions.registerShortcuts([
    {
      id: `${MODULE_NAME}/ModelViewport/viewAsGraph`,
      key: '1',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-view-graph")?.click(),
      description: 'View as graph',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/viewAsSVG`,
      key: '2',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-view-svg")?.click(),
      description: 'View as SVG',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/ModelViewport/addMaterial`,
      key: 'm',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => document.getElementById("composer-add-material")?.click(),
      description: 'Add material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/editMaterial`,
      key: 'e',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-edit"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Edit focused material',
      enabled: true,
    },
    {
      id: `${MODULE_NAME}/MaterialItem/deleteMaterial`,
      key: 'Shift+m',
      contextId: `${MODULE_NAME}/ModelViewport`,
      action: () => {
        const row = document.activeElement?.closest('[data-testid="material-item"]');
        const btn = row?.querySelector('[data-testid="material-item-delete"]') as HTMLButtonElement | null;
        btn?.click();
      },
      description: 'Remove focused material',
      enabled: true,
    },
  ])
}