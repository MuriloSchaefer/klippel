// External imports
import React, { useMemo, useRef } from "react";
import { Provider } from "react-redux";

// Kernel imports
import { initializeStore } from "@kernel/store";
import ModulesContext from "@kernel/modules/context";
import Layout from "@kernel/layout";

// Modules imports
import ComposerModule from "modules/Composer";
import ComposerViewport from "modules/Composer/components/viewport";

// Internal imports
import "./App.css";
import GraphModule from "@kernel/modules/Graph";

const App = (): React.ReactElement => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const memoizedModules = useMemo(
    () => ({
      modules: new Map([
        [GraphModule.name, GraphModule],
        [ComposerModule.name, ComposerModule],
      ]),
    }),
    [ComposerModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Provider store={initializeStore()}>
        <Layout>
          <ComposerViewport innerRef={viewportRef} />
        </Layout>
      </Provider>
    </ModulesContext.Provider>
  );
};

export default App;
