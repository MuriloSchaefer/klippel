import React, { useEffect, useMemo, useRef, useState } from "react"

import storeModule from "@kernel/modules/Store"
import graphModule from "@kernel/modules/Graphs"

import module from ".."
import ModulesContext from "../context"

const ModulesProvider = ({children}: {children: React.ReactNode | React.ReactNode[]}) => {
    const moduleManager = module.managers.modules()
    
    // TODO: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const [counter, setCounter] = useState(0) // required to guarantee loader order
    const staticModules = useMemo(()=> ([graphModule,module]), [])
    const graphsManager = graphModule.managers.graphs()

    useEffect(()=>{
        if (counter < staticModules.length){
            const mod = staticModules[counter]

            if (!moduleManager.functions.isModuleLoaded(mod.name)) {
                moduleManager.functions.loadModule(mod)
                setCounter(counter+1)
            }
        } else {
            graphsManager.functions.createGraph('modules')
        }
        
    }, [moduleManager.modulesLoaded, counter])

    return <ModulesContext.Provider value={{
        [storeModule.name]: storeModule,
    }}>
      {children}
    </ModulesContext.Provider>
}

export default React.memo(ModulesProvider)