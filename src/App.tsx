// External imports
import React, { useMemo, useRef } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/modules/context";
import Layout from "@kernel/layout";

// Modules imports
import GraphModule from "@kernel/modules/GraphsManager";

import ComposerModule from "modules/Composer";
import ComposerViewport from "modules/Composer/components/Viewport";

// Internal imports
import "./App.css";
import EventManager from "@kernel/events/manager";

const App = (): React.ReactElement => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const memoizedModules = useMemo(
    () => ({
      modules: {
        [GraphModule.name]: GraphModule,
        [ComposerModule.name]: ComposerModule,
      },
    }),
    [ComposerModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Provider store={initializeStore()}>
        <EventManager />
        <Layout>
          <ComposerViewport innerRef={viewportRef} />
        </Layout>
      </Provider>
    </ModulesContext.Provider>
  );
};

export default App;
