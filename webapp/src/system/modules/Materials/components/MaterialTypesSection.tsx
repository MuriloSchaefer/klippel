import { Button } from "@mui/material"
import { useCallback } from "react";
import useMaterialsManager from "../hooks/useMaterialsManager";



export const MaterialTypesSection = () => {


    const compositionsManager = useMaterialsManager()

    const handleModelSelection = useCallback((name:string, path:string)=>{
        // compositionsManager.functions.createComposition(name, path)
    }, [])

    return <>
        <Button onClick={()=>handleModelSelection('Create Material', 'camisa-polo/processed.svg')}>Create new material type</Button>
    </>
}

export default MaterialTypesSection