// External imports
import React from "react";

// Internal imports
import ModulesProvider, { ModulesMap } from "./modules/Loader/components/Provider";
import DynamicStore from "./modules/Store/components/DynamicStore";

import Layout from "./modules/Layout/components/WideLayout";


import composerModule from "@system/modules/Composer";

export interface InitializationConfig {
  extraModules: ModulesMap
}

const App = (): React.ReactElement => {

  const builtInModules: ModulesMap = {
    kernel: [],
    system: [composerModule]
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
