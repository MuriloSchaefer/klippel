import ModulesContext from "@kernel/contexts/modules";
import Layout from "@kernel/layout";
import React, { useMemo } from "react";
import "./App.css";

import SVGModule from "modules/SVG";

const App = (): React.ReactElement => {
  const memoizedModules = useMemo(
    () => ({ loadedModules: [SVGModule] }),
    [SVGModule]
  );

  return (
    <ModulesContext.Provider value={memoizedModules}>
      <Layout />
    </ModulesContext.Provider>
  );
};

export default App;
