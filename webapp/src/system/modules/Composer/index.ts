import { IModule } from "@kernel/modules/base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";


export interface IComposerModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
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
const module: IComposerModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Layout', 'Graph', 'SVG', 'Materials', 'Converter'],
  components: {
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default module;
