import { Box } from "@mui/material"
import { IndexedFormula } from "rdflib"
import { SELF } from "../../constants"
import MaterialSelector from "./MaterialSelector"
import MaterialTypeSelector from "./MaterialTypeSelector"

export interface FieldProps {
    interpreter: IndexedFormula, 
    subject: string
}

const sortOrder: {[name: string]: number} = {
    'MaterialType': 0,
    'Material': 1
}

/**
 * Component that checks which are the available editable fields
 * and load the proper components to edit it.
 */
const EditableFields = ({ interpreter, subject }: FieldProps) => {
    const editableFields = interpreter.each(SELF(subject), SELF('Editable'), undefined)

    if (!editableFields.length) return <>Nao editavel</>

    return <Box sx={{gap:1, display:'flex', flexDirection:'row'}}>
        {editableFields.sort((a,b) => sortOrder[a.value] - sortOrder[b.value]).map(field => {
            switch (field.value) {
                case "MaterialType": return <MaterialTypeSelector interpreter={interpreter} subject={subject}/>
                case "Material": return <MaterialSelector  interpreter={interpreter} subject={subject} />
                default: return <>error</>
            }
        })}
    </Box>
}

export default EditableFields