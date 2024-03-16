import { IModule } from "@kernel/modules/base";
import MaterialSelector from "./components/selectors/Material";
import MaterialTypeSelector from "./components/selectors/MaterialType";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule } from "./kernelCalls";
import CRUDMaterialTypeCell from "./components/selectors/CRUDMaterialTypeCell";
import useMaterials from "./hooks/useMaterials";

export interface IMaterialsModule extends IModule {
    components: {
        MaterialTypeSelector: typeof MaterialTypeSelector,
        MaterialSelector: typeof MaterialSelector,
        CRUDMaterialTypeCell: typeof CRUDMaterialTypeCell,
    },
    store: {
        actions: {
        },
        middlewares: [
        ],
        reducers: {
        }
    }
    hooks: {
        useMaterials: typeof useMaterials
    }
}
const module: IMaterialsModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: ['Layout', 'Graph', 'SVG'],
    components: {
        MaterialTypeSelector,
        MaterialSelector,
        CRUDMaterialTypeCell
    },
    store: {
        actions: {
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {useMaterials},
    constants: {},
    kernelCalls: {
        startModule: startModule,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;