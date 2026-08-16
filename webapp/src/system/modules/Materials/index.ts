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
import { CATALOG_GRAPH_ID } from "./store/graph/catalogGraph";
import {
    ensureMaterialsLoaded,
    unpinMaterials,
} from "./store/materials/actions";
import {
    configureMaterialsResidency,
    sweepMaterialsResidency,
} from "./store/residency/actions";
import useMaterialResidency, {
    useRetainedMaterials,
    useVisibleMaterials,
} from "./hooks/useMaterialResidency";

export interface IMaterialsModule extends IModule {
    components: {
        MaterialTypeSelector: typeof MaterialTypeSelector,
        MaterialTypeMultiSelector: typeof MaterialTypeMultiSelector,
        MaterialSelector: typeof MaterialSelector,
        CRUDMaterialTypeCell: typeof CRUDMaterialTypeCell,
    },
    store: {
        actions: {
            commands: {
                /** Keep these ids resident; `owner` makes the pin releasable. */
                ensureMaterialsLoaded: typeof ensureMaterialsLoaded,
                /** Release one owner's pins — its tab closed. */
                unpinMaterials: typeof unpinMaterials,
                /** Reclaim everything nothing needs, now. */
                sweepMaterialsResidency: typeof sweepMaterialsResidency,
                /** Retune the residency TTL / sweep cadence at runtime. */
                configureMaterialsResidency: typeof configureMaterialsResidency,
            },
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
        /** Imperative residency: retain / release / touch / sweep / configure. */
        useMaterialResidency: typeof useMaterialResidency,
        /** Keep a known id list resident while the caller is mounted. */
        useRetainedMaterials: typeof useRetainedMaterials,
        /** Retain a set that changes on every scroll frame, coalesced. */
        useVisibleMaterials: typeof useVisibleMaterials,
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
            commands: {
                ensureMaterialsLoaded,
                unpinMaterials,
                sweepMaterialsResidency,
                configureMaterialsResidency,
            },
        },
        middlewares: [],
        reducers: {
        },
    },
    hooks: {
        useMaterialTypes,
        useMaterials,
        useMaterial,
        useMaterialsGetter,
        useCatalogWindow,
        useMaterialResidency,
        useRetainedMaterials,
        useVisibleMaterials,
    },
    constants: {
        /**
         * Graph id of the catalog's relation graph, in the **Graph module's**
         * store. Read it with `graphModule.hooks.useGraph(CATALOG_GRAPH_ID)`
         * or `getGraphState(CATALOG_GRAPH_ID)`; this module keeps no graph of
         * its own.
         */
        CATALOG_GRAPH_ID,
    },
    kernelCalls: {
        startModule: startModule,
        postBootInitialization: postBootInitialization,
        restartModule: ()=>{},
        shutdownModule: ()=>{},
    }
};

export default module;