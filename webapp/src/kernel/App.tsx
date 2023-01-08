// External imports
import React from "react";

// Kernel imports

// Modules imports
import ModulesProvider from "./modules/Loader/components/Provider";
import DynamicStore from "./modules/Store/components/DynamicStore";

import Layout from './modules/Layout/components/Layout'

// Internal imports

const App = (): React.ReactElement => {

  return (
    // First initialize store and then load modules, since the loader requires the store to be already up
    <DynamicStore>
      <ModulesProvider >
        {/* [Authz Component here] */}
        <Layout />
      </ModulesProvider>
    </DynamicStore>
    // <ModulesContext.Provider value={memoizedModules}>

    // </ModulesContext.Provider>
  );
};

export default App;
