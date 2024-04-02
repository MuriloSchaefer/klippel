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

import CRUDGrid from "./components/CRUDGrid/CRUDGrid";
import CRUDGridProvider, { CRUDGridContext } from "./components/CRUDGrid/CRUDGridProvider";
import CRUDBooleanCell from "./components/CRUDGrid/BooleanCell";
import { useResizeObserver } from "./hooks/useResizeObserver";
import CustomTextArea from "./components/CustomFields/TextArea";

export interface ILayoutModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    SettingsPanel: typeof SettingsPanel,
    DetailsPanel: typeof DetailsPanel,
    ViewportNotificationsTray: typeof ViewportNotificationsTray,
    Accordion: typeof Accordion,
    SystemModal: typeof SystemModal,
    CRUDGridProvider: typeof CRUDGridProvider,
    CRUDBooleanCell: typeof CRUDBooleanCell,
    CRUDGrid: typeof CRUDGrid,
    CustomTextArea: typeof CustomTextArea,
  },
  contexts: {
    CRUDGridContext: typeof CRUDGridContext,
  },
  hooks: {
    useLayoutManager: typeof useLayoutManager
    useRibbonMenuManager: typeof useRibbonMenuManager
    useViewportManager: typeof useViewportManager
    usePanelsManager: typeof usePanelsManager
    useResizeObserver: typeof useResizeObserver
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
    SystemModal,
    CRUDGrid,
    CRUDBooleanCell,
    CRUDGridProvider,
    CustomTextArea
  },
  contexts: {CRUDGridContext},
  hooks: {
    useLayoutManager,
    useRibbonMenuManager,
    useViewportManager,
    usePanelsManager,
    useResizeObserver
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
