import React, { useEffect, useMemo, useState } from "react"

import storeModule from "@kernel/modules/Store"
import graphModule from "@kernel/modules/Graphs"

import module from ".."
import { GRAPH_NAME } from '../constants'
import ModulesContext from "../context"

const ModulesProvider = ({ children }: { children: React.ReactNode | React.ReactNode[] }) => {
    const moduleManager = module.managers.modules()

    // TODO: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const [counter, setCounter] = useState(0) // required to guarantee loader order
    const staticModules = useMemo(() => ([graphModule, module]), [])
    const graphsManager = graphModule.managers.graphs()

    useEffect(() => {
        if (counter < staticModules.length) {
            const mod = staticModules[counter]

            if (!moduleManager.functions.isModuleLoaded(mod.name)) {
                moduleManager.functions.loadModule(mod)
                setCounter(counter + 1)
            }
        } else {
            // all builtin modules already loaded
            // so now we create the modules graph and add builtin
            // nodes
            const graph = graphsManager.functions.createGraph(GRAPH_NAME)
            const rootNode = { id: 'root', inputs: {}, outputs: {} }
            graph.actions.addNode(rootNode)

            staticModules.forEach(mod =>
                graph.actions.addNode({
                    id: mod.name,
                    inputs: {
                        root: {
                            id: `root->${mod.name}`,
                            sourceId: 'root', targetId: mod.name
                        }
                    }, outputs: {}
                })
            )

        }

    }, [moduleManager.modulesLoaded, counter])

    return <ModulesContext.Provider value={{
        [storeModule.name]: storeModule,
    }}>
        {children}
    </ModulesContext.Provider>
}

export default React.memo(ModulesProvider)