import { Box } from "@mui/material"
import { IndexedFormula } from "rdflib"
import { SELF } from "../../constants"
import { MaterialUsageNode } from "../../store/graph/state"
import MaterialSelector from "./MaterialSelector"
import MaterialTypeSelector from "./MaterialTypeSelector"

export interface FieldProps {
    graphId: string
    node: MaterialUsageNode
}

const sortOrder: {[name: string]: number} = {
    'materialType': 0,
    'material': 1
}

/**
 * Component that checks which are the available editable fields
 * and load the proper components to edit it.
 */
const EditableFields = ({ node, graphId }: FieldProps) => {
    if (!node.editableAttributes.length) return <>Nao editavel</>

    return <Box sx={{gap:1, display:'flex', flexDirection:'row'}} role="material-attributes" aria-label="material attributes">
        {node.editableAttributes.map(field => {
            switch (field) {
                case "materialType": return <MaterialTypeSelector key={field} graphId={graphId} node={node}/>
                case "material": return <MaterialSelector key={field} graphId={graphId} node={node}/>
                default: return <>error</>
            }
        })}
    </Box>
}

export default EditableFields