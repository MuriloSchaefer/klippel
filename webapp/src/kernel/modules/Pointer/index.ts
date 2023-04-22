import { IModule } from "../base"
import MultiTouchPanel from "./components/MultiTouchPanel"
import { MODULE_NAME, MODULE_VERSION } from "./constants"
import {startModule} from './kernelCalls'


export interface IPointerModule extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    components: {
        MultiTouchPanel: typeof MultiTouchPanel
    },
    hooks: {
    },
    store: {}
  }

const pointerModule: IPointerModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: [],
    components: {
        MultiTouchPanel: MultiTouchPanel
    },
    hooks: {
    },
    store: {},
    kernelCalls: {
        startModule,
      restartModule(){},
      shutdownModule(){}
    }
}

export default pointerModule;