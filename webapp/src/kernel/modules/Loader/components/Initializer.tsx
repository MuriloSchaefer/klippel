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
    const graph = useGraph(GRAPH_NAME, (g) => g?.id)

    const [isInitializing, setIsInitializing] = useState(true)
    const [graphInitialized, setGraphInitialized] = useState(false)
    const [staticModulesLoaded, setStaticModulesLoaded] = useState(0)
    const [kernelModulesLoaded, setKernelModulesLoaded] = useState(0)
    const [extraModulesLoaded, setExtraModulesLoaded] = useState(0)
    // CHALLENGE: Find a better way to load initial modules. This current way forces an
    // app rerender for each new module added.
    const staticModules = useMemo(() => ([
        module,
        graphModule,
        layoutModule
    ]), [])

    const graphsManager = graphModule.managers.graphs()
    const {createGraph,resetGraph} = graphsManager.functions

    // LOAD STATIC MODULES
    useEffect(() => {
        // initialization logic (we may separate it in a custom hook)
        const mod = staticModules[staticModulesLoaded]
        if (mod && !moduleManager.functions.isModuleLoaded(mod.name)) loadStaticModule(mod)
        
    }, [staticModulesLoaded])

    // LOAD KERNEL MODULES
    useEffect(() => {
        if (staticModulesLoaded === staticModules.length){
            // all static modules are loaded and we can now load the kernel ones

            const mod = extraModules.kernel[kernelModulesLoaded]
            if (mod && !moduleManager.functions.isModuleLoaded(mod.name)) loadKernelModule(mod)
        }   
    }, [staticModulesLoaded, kernelModulesLoaded])


    // LOAD EXTRA MODULES
    useEffect(() => {
        if (kernelModulesLoaded === extraModules.kernel.length){
            // all kernel modules are loaded and we can now load the extra ones

            const mod = extraModules.system[extraModulesLoaded]
            if (mod && !moduleManager.functions.isModuleLoaded(mod.name)) loadExtraSystemModule(mod)
        }

        
    }, [kernelModulesLoaded, extraModulesLoaded])

    // SET INITIALIZATION COMPLETE
    useEffect(()=>{
        if(extraModulesLoaded === extraModules.system.length) setIsInitializing(false)
    }, [extraModulesLoaded])

    // CREATE GRAPH
    useEffect(()=>{
        if (!isInitializing && !graph.state) {
            createGraph(GRAPH_NAME)
            setGraphInitialized(true)
        }
    }, [isInitializing])

    // POPULATE GRAPH
    useEffect(()=>{
        // once all modules are loaded 
        //  now we create the modules graph and add all loaded modules as nodes
        if (graphInitialized && !graph.state) {
            createGraph(GRAPH_NAME)
        }
        if (!graphInitialized) return
        resetGraph(GRAPH_NAME)
        
        const rootNode = { id: 'root', type: 'ROOT' }

        graph.actions.addNode(rootNode)

        staticModules.forEach(mod =>
            graph.actions.addNode({
                id: mod.name,
                type: 'STATIC_MODULE'
            }, {inputs: {
                root: {
                    id: `root->${mod.name}`,
                    type: 'DEPENDS_ON',
                    sourceId: 'root', targetId: mod.name
                }
            }, outputs: {}})
        )
        extraModules.kernel.forEach(mod =>{
            mod.depends_on.push('Loader') // all modules depends on the loader
            const dependencies = mod.depends_on.reduce((inputs, dependency)=>{
                const dependencyEdge = {
                    id: `${dependency}->${mod.name}`,
                    type: 'DEPENDS_ON',
                    sourceId: dependency, targedId: mod.name
                }
                return {...inputs, [dependency]: dependencyEdge}
            }, {})
            graph.actions.addNode({
                id: mod.name,
                type: 'EXTRA_KERNEL_MODULE'
            }, {inputs: dependencies, outputs: {}})
        })
        
        extraModules.system.forEach(mod =>{
            mod.depends_on.push('Loader') // all modules depends on the loader
            const dependencies = mod.depends_on.reduce((inputs, dependency)=>{
                const dependencyEdge = {
                    id: `${dependency}->${mod.name}`,
                    type: 'DEPENDS_ON',
                    sourceId: dependency, targedId: mod.name
                }
                return {...inputs, [dependency]: dependencyEdge}
            }, {})
            graph.actions.addNode({
                id: mod.name,
                type: 'EXTRA_SYSTEM_MODULE'
            }, {inputs: dependencies, outputs: {}})
        })
        setIsInitializing(false)
    }, [graphInitialized])

    // HELPERS
    function loadStaticModule(mod: IModule){
        moduleManager.functions.loadModule(mod)
        setStaticModulesLoaded(staticModulesLoaded+1)
    }
    function loadKernelModule(mod: IModule){
        moduleManager.functions.loadModule(mod)
        setKernelModulesLoaded(kernelModulesLoaded+1)
    }
    async function loadExtraSystemModule(mod: IModule){
        await moduleManager.functions.loadModule(mod)
        setExtraModulesLoaded(extraModulesLoaded+1)
    }
    
    if (isInitializing) return <div>Iniciando sistema</div>

    return afterLoadComponent
}

export default Initializer