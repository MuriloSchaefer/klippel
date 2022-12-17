import { IModule } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { start } from "./kernelCalls";
import { ModulesManager, useModulesManager } from "./managers";

/**
 * The loader module
 */
interface Loader extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    managers: {
        modules: () => ModulesManager
    }
}

const module: Loader = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Store', 'Graph'],
    managers: {
        modules: useModulesManager
    },
    kernelCalls: {
        startModule: start,
        restartModule: () => null,
        shutdownModule: () => null,
    }
}

export default module