import { Manager } from "@kernel/modules/base";
import { useAppDispatch } from "@kernel/modules/Store/hooks";

import {createGraph as createGraphAction} from "../store/graphsManager/actions"

export interface GraphsManager extends Manager {
    functions: {
        createGraph: (graphId: string) => void
    }
}

const useGraphsManager = (): GraphsManager => {
    const dispatch = useAppDispatch()
    return {
        functions: {
            createGraph(graphId: string){
                dispatch(createGraphAction({graphId}))
            }
        }
    }
}

export default useGraphsManager;