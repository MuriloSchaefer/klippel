import { IModule } from "../base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";

import useLayoutManager from "./hooks/useLayoutManager";
import useRibbonMenuManager from "./hooks/useRibbonMenuManager";
import useViewportManager from "./hooks/useViewportManager";
import SettingsPanel from "./components/Panels/SettingsPanel";
import DetailsPanel from "./components/Panels/DetailsPanel";
import { Accordion } from "./components/Panels/Accordion";
import usePanelsManager from "./hooks/usePanelsManager";
import { getViewportState, selectActiveViewport } from "./store/viewports/selectors";
import ViewportNotificationsTray from "./components/SystemTray/ViewportNotificationsTray";
import SystemModal from "./components/SystemModal";

export interface ILayoutModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    SettingsPanel: typeof SettingsPanel,
    DetailsPanel: typeof DetailsPanel,
    ViewportNotificationsTray: typeof ViewportNotificationsTray,
    Accordion: typeof Accordion,
    SystemModal: typeof SystemModal,
  },
  hooks: {
    useLayoutManager: typeof useLayoutManager
    useRibbonMenuManager: typeof useRibbonMenuManager
    useViewportManager: typeof useViewportManager
    usePanelsManager: typeof usePanelsManager
  },
  store: {
    selectors: {
      selectActiveViewport: typeof selectActiveViewport,
      getViewportState: typeof getViewportState
    }
  }
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const LayoutModule: ILayoutModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    SettingsPanel,
    DetailsPanel,
    ViewportNotificationsTray,
    Accordion,
    SystemModal
  },
  hooks: {
    useLayoutManager,
    useRibbonMenuManager,
    useViewportManager,
    usePanelsManager
  },
  store: {
    selectors: {
      selectActiveViewport,
      getViewportState
    }
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default LayoutModule;
