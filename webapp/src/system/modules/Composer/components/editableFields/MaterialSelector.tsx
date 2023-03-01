import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from "@mui/material";
import AddLinkSharpIcon from '@mui/icons-material/AddLinkSharp';
import LockSharpIcon from '@mui/icons-material/LockSharp';
import { useCallback, useState } from "react";
import { FieldProps } from ".";
import { SELF, RDF } from "../../constants";


const MaterialSelector = ({ interpreter, subject }: FieldProps) => {
    const [colorsAvailable, setColorsAvailable] = useState<string[]>([])
    
    const selectedType = interpreter.any(SELF(subject), SELF('MaterialType'), undefined)

    const info = interpreter.each(SELF(subject), SELF('Material'), undefined)
    const restrictions = info.filter(n => n.value.includes('Restriction'))
    const currentValue = info.find(n => !n.value.includes('Restriction'))

    if (!currentValue || !selectedType) return <></>
    const availableMaterials = interpreter.each(undefined, SELF('type'), SELF(selectedType.value.replace('_:#', '')))

    console.log(selectedType, availableMaterials)
    const currentValueId = currentValue?.value.replace('_:#', '')
    const currentValueLabel = interpreter.any(SELF(currentValueId), RDF('label'), undefined)


    const handleMaterialSelection = useCallback((e: SelectChangeEvent, c: React.ReactNode)=> {
        if (!c) return 
        const colors = interpreter.each(SELF(e.target.value.replace('_:#', '')), RDF('colorAvailable'), undefined)
        console.log(colors)
        setColorsAvailable(colors.map(n => n.value))
    }, [interpreter])


    const handleMaterialColorSelection = useCallback((e: SelectChangeEvent, c: React.ReactNode)=> {
        console.log(e,c)
        //setColorsAvailable(colors.map(n => n.value))
    }, [interpreter])

    return <>
        <FormControl sx={{ m: 1, minWidth: 120 }} size="small">
            <InputLabel id={`${subject}-material`}>Material</InputLabel>
            <Select
                labelId={`${subject}-material`}
                label="Material"
                id="material"
                onChange={handleMaterialSelection}
            >
                {availableMaterials.map(material => {
                    const materiaLabel = interpreter.any(SELF(material.value.replace('_:#', '')), RDF('label'), undefined)
                    return <MenuItem value={material.value}>{materiaLabel?.value}</MenuItem>
                })}
            </Select>
        </FormControl>

        <FormControl sx={{ m: 1, minWidth: 120 }} size="small" disabled={colorsAvailable.length < 1}>
            <InputLabel id={`${subject}-material-color`} sx={{display:'flex', gap:1, justifyItems:'middle'}}><span>Cor</span> </InputLabel>
            <Select
                labelId={`${subject}-material-color`}
                label="Cor"
                id="color"
                onChange={handleMaterialColorSelection}
            >
                {colorsAvailable.map(color => {
                    const colorLabel = interpreter.any(SELF(color.replace('_:#', '')), RDF('label'), undefined)
                    return <MenuItem value={color}>{colorLabel?.value}</MenuItem>
                })}
            </Select>
        </FormControl>
    </>
}

export default MaterialSelector;