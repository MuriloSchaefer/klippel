import { IModule } from "../base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";

import Layout from './components/WideLayout'
import useLayoutManager from "./hooks/useLayoutManager";
import useRibbonMenuManager from "./hooks/useRibbonMenuManager";
import useViewportManager from "./hooks/useViewportManager";

export interface ILayoutModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    Layout: typeof Layout
  },
  hooks: {
    useLayoutManager: typeof useLayoutManager
    useRibbonMenuManager: typeof useRibbonMenuManager
    useViewportManager: typeof useViewportManager
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
    Layout
  },
  hooks: {
    useLayoutManager,
    useRibbonMenuManager,
    useViewportManager
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default LayoutModule;
