import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import AddLinkSharpIcon from '@mui/icons-material/AddLinkSharp';
import LockSharpIcon from '@mui/icons-material/LockSharp';
import { useCallback, useState } from "react";
import { FieldProps } from ".";
import { SELF, RDF } from "../../constants";


const MaterialSelector = ({ graphId, node }: FieldProps) => {  

    return <>
        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id={`${node.id}-material`}>Material</InputLabel>
            <Select
                labelId={`${node.id}-material`}
                label="Material"
                id="material"
                // onChange={handleMaterialSelection}
            >
                {/* {availableMaterials.map(material => {
                    const materiaLabel = interpreter.any(SELF(material.value.replace('_:#', '')), RDF('label'), undefined)
                    return <MenuItem value={material.value}>{materiaLabel?.value}</MenuItem>
                })} */}
            </Select>
        </FormControl>

        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id={`${node.id}-material-color`} sx={{display:'flex', gap:1, justifyItems:'middle'}}><span>Cor</span> </InputLabel>
            <Select
                labelId={`${node.id}-material-color`}
                label="Cor"
                id="color"
                //onChange={handleMaterialColorSelection}
            >
                {/* {colorsAvailable.map(color => {
                    //const colorLabel = interpreter.any(SELF(color.replace('_:#', '')), RDF('label'), undefined)
                    return <MenuItem value={color}>{colorLabel?.value}</MenuItem>
                })} */}
            </Select>
        </FormControl>
    </>
}

export default MaterialSelector;