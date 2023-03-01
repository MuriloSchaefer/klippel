
import { jsonld2interpreter } from "../utils";



const useRDFInterpreter = (nodes?: any[]) => {
    if (!nodes) return null

    return jsonld2interpreter(nodes)
}

export default useRDFInterpreter;