import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { Button } from "@mui/material"
import { MouseEvent, useCallback } from "react";
import useCompositionsManager from "../hooks/compositionsManager";


export const ModelSection = () => {


    const compositionsManager = useCompositionsManager()

    const handleModelSelection = useCallback((e: MouseEvent)=>{
        console.log(e)
        compositionsManager.functions.newComposition('Test', 'camisa-polo/processed.svg')
    }, [])

    return <Button onClick={handleModelSelection}>Model</Button>
}

export default ModelSection