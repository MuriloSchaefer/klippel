import React, { useMemo, useState } from "react"

import storeModule from "@kernel/modules/Store"

import ModulesContext, { ModulesContextType } from "../context"
import Initializer from "./Initializer"


const ModulesProvider = ({ children }: { children: React.ReactElement }) => {

    const [modules, setModules] = useState<ModulesContextType>({
        Store: storeModule
    })
    const values = useMemo(() => ({
        modules, setModules,
    }), [])


    return <ModulesContext.Provider value={values}>
        <Initializer afterLoadComponent={children}/>
    </ModulesContext.Provider>
}

export default React.memo(ModulesProvider)