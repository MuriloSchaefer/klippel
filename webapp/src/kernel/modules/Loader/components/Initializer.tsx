import React, { useEffect, useMemo, useState } from "react"


// TODO: how to make below modules dynamic?
import graphModule from "@kernel/modules/Graphs"
import layoutModule from "@kernel/modules/Layout"
import storeModule from "@kernel/modules/Store"


import module from ".."
import { GRAPH_NAME } from '../constants'
import useGraph from "@kernel/modules/Graphs/hooks/useGraph"
import { ModulesMap } from "./Provider"
import _ from "lodash"
import {IModule} from "../../base"


const Initializer = ({ afterLoadComponent, extraModules={kernel:[], system:[]} }: { afterLoadComponent: React.ReactElement, extraModules: ModulesMap }) => {
    const moduleManager = module.managers.modules()
    const graph = useGraph(GRAPH_NAME, (g) => g && g.id)

    const [isInitializing, setIsInitializing] = useState(true)
    const [graphInitialized, setGraphInitialized] = useState(false)
    const [extraModulesLoaded, setExtraModulesLoaded] = useState(0)
    const [staticModulesLoaded, setStaticModulesLoaded] = useState(0)
    // TODO: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const staticModules = useMemo(() => ([
        module,
        graphModule,
        layoutModule
    ]), [])

    const graphsManager = graphModule.managers.graphs()
    const {createGraph,resetGraph} = graphsManager.functions

    // useEffect(()=>{
    //     const mod = staticModules[0]
    //     if (!moduleManager.functions.isModuleLoaded(mod.name)) loadStaticModule(mod)
    // }, [])

    useEffect(() => {
        // initialization logic (we may separate it in a custom hook)
        const mod = staticModules[staticModulesLoaded]
        if (mod && !moduleManager.functions.isModuleLoaded(mod.name)) loadStaticModule(mod)
        
    }, [staticModulesLoaded])


    useEffect(() => {
        if (staticModulesLoaded === staticModules.length){
            // all static modules are loaded and we can now load the extra ones

            const mod = extraModules.system[extraModulesLoaded]
            if (mod && !moduleManager.functions.isModuleLoaded(mod.name)) loadExtraSystemModule(mod)
        }

        
    }, [staticModulesLoaded, extraModulesLoaded])

    useEffect(()=>{
        if(extraModulesLoaded === extraModules.system.length) setIsInitializing(false)
    }, [extraModulesLoaded])

    useEffect(()=>{
        if (!isInitializing && !graph.state) {
            createGraph(GRAPH_NAME)
            setGraphInitialized(true)
        }
    }, [isInitializing])

    useEffect(()=>{
        // once all modules are loaded 
        //  now we create the modules graph and add all loaded modules as nodes
        if (graphInitialized && !graph.state) {
            createGraph(GRAPH_NAME)
        }
        if (!graphInitialized) return
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
        extraModules.system.forEach(mod =>{
            mod.depends_on.push('Loader') // all modules depends on the loader
            const dependencies = mod.depends_on.reduce((inputs, dependency)=>{
                const dependencyEdge = {
                    id: `${dependency}->${mod.name}`,
                    sourceId: dependency, targedId: mod.name
                }
                return {...inputs, [dependency]: dependencyEdge}
            }, {})
            graph.actions.addNode({
                id: mod.name,
                inputs: dependencies, outputs: {}
            })
        })
    }, [graphInitialized])

    function loadStaticModule(mod: IModule){
        moduleManager.functions.loadModule(mod)
        setStaticModulesLoaded(staticModulesLoaded+1)
    }
    function loadExtraSystemModule(mod: IModule){
        moduleManager.functions.loadModule(mod)
        setExtraModulesLoaded(extraModulesLoaded+1)
    }
    
    if (isInitializing) return <div>Iniciando sistema</div>

    return afterLoadComponent
}

export default Initializer