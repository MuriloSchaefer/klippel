import Button from "@mui/material/Button"
import { useCallback } from "react";
import useMaterialsTypesManager from "../hooks/useMaterialsTypesManager";



export const MaterialTypesSection = () => {


    const compositionsManager = useMaterialsTypesManager()

    const handleModelSelection = useCallback((name:string, path:string)=>{
        // compositionsManager.functions.createComposition(name, path)
    }, [])

    return <>
        <Button onClick={()=>handleModelSelection('Create Material', 'camisa-polo/processed.svg')}>Create new material type</Button>
    </>
}

export default MaterialTypesSection