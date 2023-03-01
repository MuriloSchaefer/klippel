import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { FieldProps } from ".";
import { RDF, SELF } from "../../constants";


const MaterialTypeSelector = ({ interpreter, subject }: FieldProps) => {

    const info = interpreter.each(SELF(subject), SELF('MaterialType'), undefined)
    const restrictions = info.filter(n => n.value.includes('Restriction'))
    const currentValue = info.find(n => !n.value.includes('Restriction'))

    if (!currentValue) return <></>

    const currentValueLabel = interpreter.any(SELF(currentValue?.value.replace('_:#', '')), RDF('label'), undefined)
    
    const availableOptions = restrictions.reduce((acc,curr)=> {
        const options = interpreter.each(SELF(curr.value.replace('_:#', '')), RDF('allowOnly'), undefined)

        return [...acc, ...options.map(n=>n.value)]
    }, [] as string[])

    return <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
        <InputLabel id={`${subject}-material-type-label`}>Tipo</InputLabel>
        <Select
            labelId={`${subject}-material-type-label`}
            id={`${subject}-material-type-label`}
            value={currentValue.value}
            label="Tipo"
        >
            {availableOptions.map(option => {
                const label = interpreter.any(SELF(option.replace('_:#', '')), RDF('label'), undefined)
                return <MenuItem value={option}>{label?.value}</MenuItem>
            })}
            
        </Select>
    </FormControl>
}

export default MaterialTypeSelector;