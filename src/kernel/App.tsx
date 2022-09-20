// External imports
import React, { useMemo } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/contexts/modules";
import Layout from "@kernel/modules/LayoutManager/components";

// Modules imports
import LayoutModule from "@kernel/modules/LayoutManager";
import GraphModule from "@kernel/modules/GraphsManager";

import ComposerModule from "modules/Composer";

// Internal imports

const App = (): React.ReactElement => {
  const memoizedModules = useMemo(
    () => ({
      modules: {
        [LayoutModule.name]: LayoutModule,
        [GraphModule.name]: GraphModule,
        [ComposerModule.name]: ComposerModule,
      },
    }),
    [LayoutModule, GraphModule, ComposerModule]
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
