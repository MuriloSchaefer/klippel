// External imports
import React from "react";

// Internal imports
import ModulesProvider, {
  ModulesMap,
} from "./modules/Loader/components/Provider";
import DynamicStore from "./modules/Store/components/DynamicStore";
import Layout from "./modules/Layout/components/WideLayout";
import KeyboardListener from "./modules/KeyboardShortcuts/components/KeyboardListener";

// System modules
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import Paper from "@mui/material/Paper";

import { Button, IconButton, Typography } from "@mui/material";
import { InfoOutlineSharp } from "@mui/icons-material";
import PointerContainer from "./modules/Pointer/components/PointerContainer";

export function fallbackRender({ error, resetErrorBoundary }: FallbackProps) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  return (
    <Paper
      variant="outlined"
      role="error"
      sx={{ padding: 2, width: "100%", overflowX: "auto" }}
    >
      <pre style={{ color: "red" }}>{error.stack}</pre>
      <Button onClick={resetErrorBoundary}>Tentar novamente</Button>
      <Button onClick={() => console.log("report error")}>Reportar</Button>
    </Paper>
  );
}

export function fallbackRenderLabelOnly({
  error,
  resetErrorBoundary,
}: FallbackProps) {

  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  return (
    <Typography
      color="error"
      sx={{ display: "flex", alignItems: "center", gap: 1 }}
    >
      Erro: {error.message}{" "}
      <PointerContainer
        component={
          <Paper
            variant="outlined"
            role="error"
            sx={{ padding: 2, width: "100%", overflowX: "auto" }}
          >
            <pre style={{ color: "red" }}>{error.stack}</pre>
            <Button onClick={resetErrorBoundary}>Tentar novamente</Button>
            <Button onClick={() => console.log("report error")}>
              Reportar
            </Button>
          </Paper>
        }
        actions={[]}
      >
        <IconButton size="small" color={"error"} component="span">
          <InfoOutlineSharp />
        </IconButton>
      </PointerContainer>
    </Typography>
  );
}

export interface InitializationConfig {
  extraModules: ModulesMap;
}

const App = (): React.ReactElement => {
  return (
    // First initialize store and then load modules, since the loader requires the store to be already up
    <ErrorBoundary fallbackRender={fallbackRender}>
      <DynamicStore>
        <ModulesProvider>
          {/* Global keyboard event listener - captures all keyboard shortcuts */}
          <KeyboardListener />
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
