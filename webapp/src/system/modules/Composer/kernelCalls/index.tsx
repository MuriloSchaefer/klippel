import { StartModuleProps } from "@kernel/modules/base";
import React from "react";
import Composerviewport from "../components/ComposerViewport";
import ModelSection from "../components/ModelSection";
import { MODULE_NAME } from "../constants";
import middlewares from "../store/middlewares";
import graphMiddlewares from "../store/composition/middlewares";
import slice from "../store/slice";
import DebuggerViewport from "../components/DebuggerViewport";

export function startModule({
  managers: { storeManager, componentRegistryManager, ribbonMenuManager },
  db,
}: StartModuleProps) {
  // dbManager.createDB('product-catalog')
  if (!db.products) {
    db.addCollections({
      products: {
        schema: {
          title: "products",
          version: 0,
          description: "stores all the products catalog",
          primaryKey: "id",
          type: "object",
          properties: {
            name: { type: "string" },
            id: { type: "string", maxLength: 36 },
            rootFolder: { type: "string" },
            description: { type: "string" },
          },
        },
        migrationStrategies: {},
      },
    }).then(async ({ products }) => {
      const results = await products.find({ selector: { id: "1" } }).exec();
      if (!results.length) {
        products.insert({
          name: "Camisa feminina",
          id: "1",
          rootFolder: "{{home}}/catalog/camisa-feminina",
          description: "#Title\n\nDescription here",
        });
      }
    });
  }

  storeManager.functions.loadReducer(MODULE_NAME, slice.reducer);
  storeManager.functions.registerMiddleware(middlewares);
  storeManager.functions.registerMiddleware(graphMiddlewares);

  componentRegistryManager.functions.registerComponents({
    ribbonMenuSections: {
      ModelSelector: React.memo(ModelSection),
    },
    viewportTypes: {
      Composer: React.memo(Composerviewport),
      DebuggerViewport: DebuggerViewport,
    },
  });
  ribbonMenuManager.functions.addNewTab({
    label: "Compositor",
    sectionNames: ["ModelSelector"],
    type: "base",
  });

  //storeManager.functions.registerMiddleware(middleware)
}
