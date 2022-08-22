// External imports
import React, { useMemo } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/modules/context";
import Layout from "@kernel/layout";

// Modules imports
import GraphModule from "@kernel/modules/GraphsManager";

import ComposerModule from "modules/Composer";

// Internal imports

const App = (): React.ReactElement => {
  const memoizedModules = useMemo(
    () => ({
      modules: {
        [GraphModule.name]: GraphModule,
        [ComposerModule.name]: ComposerModule,
      },
    }),
    [GraphModule, ComposerModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Provider store={initializeStore(memoizedModules.modules)}>
        <Layout />
      </Provider>
    </ModulesContext.Provider>
  );
};

export default App;
