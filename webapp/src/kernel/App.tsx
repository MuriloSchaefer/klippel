// External imports
import React from "react";

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
import ordersModule from "@system/modules/Orders";

export interface InitializationConfig {
  extraModules: ModulesMap
}

const App = (): React.ReactElement => {

  const builtInModules: ModulesMap = {
    kernel: [SVG, pointerModule, Markdown],
    system: [converterModule, materialsModule, composerModule, ordersModule ]
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
