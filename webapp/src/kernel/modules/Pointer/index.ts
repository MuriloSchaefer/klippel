import { IModule } from "../base";
import PointerContainer from "./components/PointerContainer";
import MultiTouchPanel from "./components/MultiTouchPanel";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import { ConfirmAndCloseButton } from "./components/ConfirmAndCloseButton";

export interface IPointerModule extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    MultiTouchPanel: typeof MultiTouchPanel;
    PointerContainer: typeof PointerContainer;
    ConfirmAndCloseButton: typeof ConfirmAndCloseButton;
  };
  hooks: {
  };
  store: {};
}

const pointerModule: IPointerModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    MultiTouchPanel,
    PointerContainer,
    ConfirmAndCloseButton
  },
  hooks: {
  },
  store: {},
  kernelCalls: {
    startModule,
    restartModule() {},
    shutdownModule() {},
  },
};

export default pointerModule;
