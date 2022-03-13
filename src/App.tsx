// External imports
import React, { useMemo, useRef } from "react";

// Kernel imports
import ModulesContext from "@kernel/modules/context";
import Layout from "@kernel/layout";

// Modules imports
import ComposerModule from "modules/Composer";
import ComposerViewport from "modules/Composer/viewport";

// Internal imports
import "./App.css";

const App = (): React.ReactElement => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const memoizedModules = useMemo(
    () => ({
      modules: new Map([[ComposerModule.name, ComposerModule]]),
    }),
    [ComposerModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Layout>
        <ComposerViewport
          ref={viewportRef}
          modelPath="/catalog/camiseta-fem/croqui-p/modelo.svg"
        />
      </Layout>
    </ModulesContext.Provider>
  );
};

export default App;
