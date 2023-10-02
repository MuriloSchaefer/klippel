import { useCallback } from "react";

import IconButton from "@mui/material/IconButton";
import FileOpenIcon from "@mui/icons-material/FileOpen";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

import ModelSelectionModal from "./ModelSelectionModal";
import useCompositionsManager from "../hooks/useCompositionsManager";

export const ModelSection = () => {
  const compositionsManager = useCompositionsManager();
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { SystemModal } = layoutModule.components;

  const handleModelSelection = useCallback((name: string, path: string) => {
    compositionsManager.functions.createComposition(name, path);
  }, []);

  return (
    <>
      <SystemModal
        component={
          <ModelSelectionModal onModelSelection={handleModelSelection} />
        }
      >
        <IconButton>
          <FileOpenIcon />
        </IconButton>
      </SystemModal>
    </>
  );
};

export default ModelSection;
