

import { IModule } from "@kernel/modules/base";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule, postBootInitialization } from './kernelCalls';


export type CompositionState = { name: string; [key: string]: unknown };

export interface IComposerModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {},
  hooks: {
    useComposition: <T>(
      options: { viewportName?: string | null },
      selector: (composition: CompositionState | null | undefined) => T
    ) => { state: T; actions: Record<string, (...args: unknown[]) => void> };
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
  hooks:{
    useComposition: <T>(_options: unknown, selector: (c: CompositionState | null | undefined) => T) => ({ state: selector(null), actions: {} }),
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){},
    postBootInitialization,
  }
}

export default module;
