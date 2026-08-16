import { IModule } from "@kernel/modules/base";
import MaterialSelector from "./components/selectors/Material";
import MaterialTypeSelector, { MaterialTypeMultiSelector } from "./components/selectors/MaterialType";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import { startModule, postBootInitialization } from "./kernelCalls";
import CRUDMaterialTypeCell from "./components/selectors/CRUDMaterialTypeCell";
import useMaterialTypes from "./hooks/useMaterialTypes";
import useMaterials from "./hooks/useMaterials";
import useMaterial from "./hooks/useMaterial";
import useMaterialsGetter from "./hooks/useMaterialsGetter";
import useCatalogWindow from "./hooks/useCatalogWindow";

export interface IMaterialsModule extends IModule {
    components: {
        MaterialTypeSelector: typeof MaterialTypeSelector,
        MaterialTypeMultiSelector: typeof MaterialTypeMultiSelector,
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
        useMaterialTypes: typeof useMaterialTypes,
        useMaterials: typeof useMaterials,
        useMaterial: typeof useMaterial,
        useMaterialsGetter: typeof useMaterialsGetter,
        useCatalogWindow: typeof useCatalogWindow,
    }
}
const module: IMaterialsModule = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    // `Store` is loaded out-of-band by `Loader/Initializer` and is not a
    // node in the modules dependency graph — listing it here makes the
    // Initializer dispatch an `addNode` with an edge whose `sourceId`
    // has no adjacency entry, which crashes the Graphs reducer.
    depends_on: ['Layout', 'Graph', 'SVG', 'KeyboardShortcuts', 'Pointer', 'Converter'],
    components: {
        MaterialTypeSelector,
        MaterialTypeMultiSelector,
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
    hooks: {useMaterialTypes, useMaterials, useMaterial, useMaterialsGetter, useCatalogWindow},
    constants: {},
    kernelCalls: {
        startModule: startModule,
        postBootInitialization: postBootInitialization,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;