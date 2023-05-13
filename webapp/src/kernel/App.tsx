// External imports
import React from "react";

// Internal imports
import ModulesProvider, { ModulesMap } from "./modules/Loader/components/Provider";
import DynamicStore from "./modules/Store/components/DynamicStore";
import Layout from "./modules/Layout/components/WideLayout";

// Kernel modules
import SVG from "./modules/SVG";

// System modules
import converterModule from "@system/modules/Converter";
import materialsModule from "@system/modules/Materials";
import composerModule from "@system/modules/Composer";
import pointerModule from "./modules/Pointer";

export interface InitializationConfig {
  extraModules: ModulesMap
}

const App = (): React.ReactElement => {

  const builtInModules: ModulesMap = {
    kernel: [SVG, pointerModule],
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
