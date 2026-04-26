import { useCallback, forwardRef } from "react";

import IconButton from "@mui/material/IconButton";
import FileOpenIcon from "@mui/icons-material/FileOpen";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

import ModelSelectionModal from "./ModelSelectionModal";
import { Model } from "../../typings";
import useModelsManager from "../../hooks/useModelsManager";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../constants";

export const OpenModelIconButton = forwardRef<HTMLButtonElement>((props, ref) => {
  const modelsManager = useModelsManager();
  const layoutModule = useModule<ILayoutModule>("Layout");
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");

  const { SystemModal } = layoutModule.components;
  const { ShortcutHint } = keyboardShortcutsModule.components;
  

  const handleModelSelection = useCallback((model: Model) => {
    modelsManager.openModel(model);
  }, []);

  return (
    <SystemModal
      component={
        <ModelSelectionModal onModelSelection={handleModelSelection} />
      }
      button={
        <IconButton ref={ref} id="open-model-modal">
          <ShortcutHint placement="bottom-center" shortcutId={`${MODULE_NAME}/ModelSection/openModel`}>
            <FileOpenIcon />
          </ShortcutHint>
        </IconButton>
      }
    />
  );
});

export default OpenModelIconButton;
