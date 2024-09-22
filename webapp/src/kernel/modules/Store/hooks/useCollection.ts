import { useContext } from "react";
import { RxDBContext } from "../contexts/RxDBRegistry";
import { RxCollection } from "rxdb";


/**
 * Returns an RxDB instance 
 */
export default function useCollection<DocType = any>(name: string){
    const db = useContext(RxDBContext);
    return db![name] as RxCollection<DocType>
}