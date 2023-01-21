import React, { useMemo, useState } from "react"

import storeModule from "@kernel/modules/Store"

import ModulesContext, { ModulesContextType } from "../context"
import Initializer from "./Initializer"
import { IModule } from "@kernel/modules/base"

export interface ModulesMap {
    kernel: IModule[], //e.g. SVG: "./kernel/modules/SVG "
    system: IModule[],
  }
const ModulesProvider = ({ children, loadModules }: { children: React.ReactElement, loadModules: ModulesMap }) => {

    const [modules, setModules] = useState<ModulesContextType>({
        Store: storeModule
    })
    const values = useMemo(() => ({
        modules, setModules,
    }), [])

    //const pathsToLoad = useMemo(()=>([...Object.values(loadModules.kernel), ...Object.values(loadModules.system)]), [loadModules])


    return <ModulesContext.Provider value={values}>
        <Initializer extraModules={loadModules} afterLoadComponent={children}/>
    </ModulesContext.Provider>
}

export default React.memo(ModulesProvider)