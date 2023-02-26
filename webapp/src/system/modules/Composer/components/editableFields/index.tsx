import { IndexedFormula } from "rdflib"
import { SELF } from "../../constants"
import MaterialSelector from "./MaterialSelector"
import MaterialTypeSelector from "./MaterialTypeSelector"

/**
 * Component that checks which are the available editable fields
 * and load the proper components to edit it.
 */
const EditableFields = ({ interpreter, subject }: { interpreter: IndexedFormula, subject: string }) => {
    const editableFields = interpreter.each(SELF(subject), SELF('Editable'), undefined)

    if (!editableFields.length) return <>Nao editavel</>
    console.log(editableFields)

    return <>
        {editableFields.map(field => {
            switch (field.value) {
                case "MaterialType": return <MaterialTypeSelector />
                case "Material": return <MaterialSelector />
                default: return <>error</>
            }
        })}
    </>
}

export default EditableFields