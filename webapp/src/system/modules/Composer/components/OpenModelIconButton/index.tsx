import { useCallback } from "react";

import IconButton from "@mui/material/IconButton";
import FileOpenIcon from "@mui/icons-material/FileOpen";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

import ModelSelectionModal from "./ModelSelectionModal";
import { Model } from "../../typings";
import useModelsManager from "../../hooks/useModelsManager";
// import useCompositionsManager from "../hooks/useCompositionsManager";

export const OpenModelIconButton = () => {
  const modelsManager = useModelsManager();
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { SystemModal } = layoutModule.components;
  

  const handleModelSelection = useCallback((model: Model) => {
    modelsManager.openModel(model);
  }, []);

  return (
    <SystemModal
      component={
        <ModelSelectionModal onModelSelection={handleModelSelection} />
      }
      button={
        <IconButton>
          <FileOpenIcon />
        </IconButton>
      }
    />
  );
};

export default OpenModelIconButton;
