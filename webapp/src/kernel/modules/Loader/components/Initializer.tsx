import React, { useEffect, useMemo, useState } from "react"

import graphModule from "@kernel/modules/Graphs"

// TODO: how to make below modules dynamic?
import layoutModule from "@kernel/modules/Layout"


import module from ".."
import { GRAPH_NAME } from '../constants'


const Initializer = ({ children }: { children: React.ReactNode | React.ReactNode[] }) => {
    const moduleManager = module.managers.modules()

    // TODO: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const [counter, setCounter] = useState(0) // required to guarantee loader order
    const staticModules = useMemo(() => ([
        module,
        graphModule,
        layoutModule
    ]), [])
    const graphsManager = graphModule.managers.graphs()

    useEffect(() => {
        if (counter < staticModules.length) {
            const mod = staticModules[counter]

            if (!moduleManager.functions.isModuleLoaded(mod.name)) {
                moduleManager.functions.loadModule(mod)
                setCounter(counter+1)
            }
        } else {
            // all builtin modules already loaded
            // so now we create the modules graph and add builtin
            // nodes
            console.group('creating graph')
            console.log('validation', counter, staticModules.length)
            const graph = graphsManager.functions.createGraph(GRAPH_NAME)
            const rootNode = { id: 'root', inputs: {}, outputs: {} }

            console.log('creating root node')
            graph.actions.addNode(rootNode)

            console.log('creating static module nodes')
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
            console.groupEnd()

        }

    }, [counter])

    return <div role="module-initializer">
        {children}
    </div>
}

export default Initializer