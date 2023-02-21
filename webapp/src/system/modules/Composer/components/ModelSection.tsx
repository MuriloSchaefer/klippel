import { Button } from "@mui/material"
import { useCallback } from "react";
import useCompositionsManager from "../hooks/useCompositionsManager";


export const ModelSection = () => {


    const compositionsManager = useCompositionsManager()

    const handleModelSelection = useCallback((name:string, path:string)=>{
        compositionsManager.functions.createComposition(name, path)
    }, [])

    return <>
        <Button onClick={()=>handleModelSelection('Original', 'camisa-polo/processed.svg')}>Original</Button>
        <Button onClick={()=>handleModelSelection('Decorated', 'camisa-polo/decorated.svg')}>Decorado</Button>
    </>
}

export default ModelSection