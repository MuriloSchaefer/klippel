

import { IModule } from "@kernel/modules/base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule, postBootInitialization } from './kernelCalls';
import useVariationUnitCost from "./hooks/useVariationUnitCost";


export interface IComposerModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {},
  hooks: {
    /** Cost per produced unit for a variation — see `utils/variationUnitCost`. */
    useVariationUnitCost: typeof useVariationUnitCost,
  };
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
  hooks:{ useVariationUnitCost },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){},
    postBootInitialization,
  }
}

export default module;
