// External imports
import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

// Internal imports
import ModulesProvider, { ModulesMap } from "./modules/Loader/components/Provider";
import DynamicStore from "./modules/Store/components/DynamicStore";
import Layout from "./modules/Layout/components/WideLayout";

// Kernel modules
import SVG from "./modules/SVG";
import pointerModule from "./modules/Pointer";
import Markdown from "./modules/Markdown";

// System modules
import converterModule from "@system/modules/Converter";
import materialsModule from "@system/modules/Materials";
import composerModule from "@system/modules/Composer";

export interface InitializationConfig {
  extraModules: ModulesMap
}

const App = (): React.ReactElement => {

  const intervalMS = 60 * 60 * 1000;

  const updateServiceWorker = useRegisterSW({
    onRegistered(r) {
      r &&
        setInterval(() => {
          r.update();
        }, intervalMS);
    },
  });

  const builtInModules: ModulesMap = {
    kernel: [SVG, pointerModule, Markdown],
    system: [converterModule, materialsModule, composerModule ]
  }
  
  return (
    // First initialize store and then load modules, since the loader requires the store to be already up
    <DynamicStore>
      <ModulesProvider loadModules={builtInModules}>
        {/* [Authz Component here]
            This is only loaded after initialization is complete
         */}
        <Layout /> 
      </ModulesProvider>
    </DynamicStore>
  );
};

export default App;
