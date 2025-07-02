// External imports
import React from "react";

// Internal imports
import ModulesProvider, {
  ModulesMap,
} from "./modules/Loader/components/Provider";
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
import { ErrorBoundary } from "react-error-boundary";
import Paper from '@mui/material/Paper';

import { Button } from "@mui/material";

function fallbackRender({ error, resetErrorBoundary }: any) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.

  return (
    <Paper variant="outlined" role="alert">
      <p>Erro:</p>
      <pre style={{ color: "red" }}>{error.message}</pre>
      <Button onClick={resetErrorBoundary}>Tentar novamente</Button>
    </Paper>
  );
}

export interface InitializationConfig {
  extraModules: ModulesMap;
}

const App = (): React.ReactElement => {
  const builtInModules: ModulesMap = {
    kernel: {
      [SVG.name]:SVG, 
      [pointerModule.name]:pointerModule, 
      [Markdown.name]:Markdown
    },
    system: {
      [converterModule.name]: converterModule, 
      [materialsModule.name]: materialsModule, 
      [composerModule.name]: composerModule, 
      // [ordersModule.name]: ordersModule
    },
  };
  return (
    // First initialize store and then load modules, since the loader requires the store to be already up
    <ErrorBoundary fallbackRender={fallbackRender}>
      <DynamicStore>
      <ModulesProvider extraModules={builtInModules}>
        {/* [Authz Component here]
            This is only loaded after initialization is complete
         */}
        <Layout />
      </ModulesProvider>
    </DynamicStore>
    </ErrorBoundary>
  );
};

export default App;
