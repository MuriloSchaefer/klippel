
import _ from "lodash";
import { graph, jsonParser, Namespace, serialize, sym, literal, IndexedFormula } from "rdflib";
import { SELF, RDF } from "../constants";



const linkNode = (interpreter: IndexedFormula, nodeId: string, predicate: any, values: any[]) => {
    values.forEach((entry: any) => {
        
        // any entry key that is not id or value
        Object.entries(entry).forEach(([k, v]: [string, any]) =>{
            if (k === '@id' || k === '@value'){
                const obj = '@id' in entry ? sym(entry['@id']) : literal(entry['@value'])
                interpreter.add(sym(nodeId), predicate, obj)
                return
            }
            linkNode(interpreter, nodeId, predicate, v)
        })
    })
}


const useRDFInterpreter = (nodes?: any[]) => {
    if (!nodes) return null
    var interpreter = graph()

    nodes.filter(n => ('@id' in n) && ('@type' in n))

    // add all nodes
    nodes.forEach(node => {
        const nodeId = node['@id']
        node['@type'].forEach((type: string) => {
            const predicate = type.startsWith('_:') ? SELF('type') : RDF('type')
            interpreter.add(nodeId, predicate, type.split('#')[1])
        })

    })

    // link nodes
    nodes.forEach(node => {
        const nodeId = node['@id']
        Object.entries(node).forEach(([key, values]: [string, any]) => {
            if (['@id', '@type'].includes(key)) return
            const suffix = key.split('#')[1]
            const predicate = key.startsWith('_:') ? SELF(suffix) : RDF(suffix)
            linkNode(interpreter, nodeId, predicate, values)

        })
    })

    return interpreter
}

export default useRDFInterpreter;