import { Manager } from "@kernel/modules/base";
import { useAppDispatch } from "@kernel/modules/Store/hooks";
import { addEdge, addNode, removeEdge, removeNode, resetGraph, updateNode } from "../store/graphInstance/actions";

import {createGraph as createGraphAction} from "../store/graphsManager/actions"
import { newGraphState } from "../store/state";
import { DEFAULT_EDGES, Graph } from "./useGraph";
import Node from "../interfaces/Node";

export interface GraphsManager extends Manager {
    functions: {
        createGraph: (graphId: string) => Graph 
        resetGraph: (graphId: string) => void
    }
}



const useGraphsManager = (): GraphsManager => {
    const dispatch = useAppDispatch()


    return {
        functions: {
            createGraph(graphId){
                dispatch(createGraphAction({graphId}))

                return {
                    id: graphId,
                    state: {id: graphId, ...newGraphState},
                    actions: {
                      addNode: (node, edges) => {
                        const positionedNode: Node = {...node, position: {x:0,y:0}}
                        dispatch(addNode({ graphId, node: positionedNode, edges: edges ?? DEFAULT_EDGES }));
                      },
                      removeNode: (id) => {
                        dispatch(removeNode({ graphId, nodeId: id }));
                      },
                      updateNode: (node) => {
                        dispatch(updateNode({ graphId, nodeId: node.id, changes: node }));
                      },
                      addEdge: (edge) => {
                        dispatch(addEdge({ graphId, edge }));
                      },
                      updateEdge: (edgeId, changes) => {
                        console.error('Not implemented yet')
                      },
                      removeEdge: (id) => {
                        dispatch(removeEdge({ graphId, edgeId: id }));
                      },
                      nodeExists: (id)=> false, //QUESTION: how to implement this here?
                      search: ()=>'null' // TODO: implement search dispatch here
                    },
                  }
            },
            resetGraph(graphId){
              dispatch(resetGraph({graphId}))
            }
        }
    }
}

export default useGraphsManager;