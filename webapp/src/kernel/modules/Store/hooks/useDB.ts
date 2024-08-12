import { useContext } from "react"
import { RxDBContext, RxDBRegistry } from "../contexts/RxDBRegistry"
import { RxDatabase } from "rxdb"


/**
 * Returns an RxDB instance 
 * @param dbName db name
 * @returns 
 */
export default function useDB<T extends RxDatabase = RxDatabase>(dbName?: string){

    const {instances} = useContext(RxDBContext)


    if (dbName && dbName in instances){
        return instances[dbName as keyof RxDBRegistry] as T
    }

    return instances.default as T
}