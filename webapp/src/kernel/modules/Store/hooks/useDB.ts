import { useContext } from "react";
import { RxDBContext } from "../contexts/RxDBRegistry";


/**
 * Returns an RxDB instance 
 */
export default function useDB(){

    const db = useContext(RxDBContext);
    return db!
}