import React, { useEffect, useMemo, useState } from "react"


// TODO: how to make below modules dynamic?
import graphModule from "@kernel/modules/Graphs"
import layoutModule from "@kernel/modules/Layout"
import storeModule from "@kernel/modules/Store"


import module from ".."
import { GRAPH_NAME } from '../constants'
import useGraph from "@kernel/modules/Graphs/hooks/useGraph"


const Initializer = ({ afterLoadComponent }: { afterLoadComponent: React.ReactElement }) => {
    const moduleManager = module.managers.modules()
    const graph = useGraph(GRAPH_NAME, (g) => g && g.id)

    const [isInitializing, setIsInitializing] = useState(true)
    // TODO: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const [counter, setCounter] = useState(0) // required to guarantee loader order
    const staticModules = useMemo(() => ([
        module,
        graphModule,
        layoutModule
    ]), [])
    const graphsManager = graphModule.managers.graphs()
    const {createGraph,resetGraph} = graphsManager.functions

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
            if (!graph.state) {
                createGraph(GRAPH_NAME)
                return
            }
            resetGraph(GRAPH_NAME)
            
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
            setIsInitializing(false)
        }

    }, [counter, graph.state])

    if (isInitializing) return <div>Iniciando sistema</div>

    return afterLoadComponent
}

export default Initializer