import React, { useMemo, useState } from "react"

import storeModule from "@kernel/modules/Store"

import ModulesContext, { ModulesContextType } from "../context"
import Initializer from "./Initializer"
import { IModule } from "@kernel/modules/base"

export interface ModulesMap {
    kernel: {
        [name: string]: IModule
    }, //e.g. SVG: "./kernel/modules/SVG "
    system: {
        [name: string]: IModule
    },
  }
const ModulesProvider = ({ children }: { children: React.ReactElement | React.ReactElement[]}) => {

    const [modules, setModules] = useState<ModulesContextType>({
        Store: storeModule
    })
    const values = useMemo(() => ({
        modules, setModules,
    }), [modules])

    //const pathsToLoad = useMemo(()=>([...Object.values(loadModules.kernel), ...Object.values(loadModules.system)]), [loadModules])


    return <ModulesContext.Provider value={values}>
        <Initializer  afterLoadComponent={children}/>
    </ModulesContext.Provider>
}

export default React.memo(ModulesProvider)