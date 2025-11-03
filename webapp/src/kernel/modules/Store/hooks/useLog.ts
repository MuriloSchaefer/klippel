import { PathLike } from "fs"

const getTimestamp = ()=>{
    const date = new Date()
    const timestamp = `${date.getDate()}/${date.getMonth()}/${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`
    return timestamp
}
const storage = globalThis.electron.storage;
export default function useLog(module: string, path:PathLike){
    storage.ensureDir(path.toString().split("/").slice(0, -1).join("/"))
    return (log: string) => {
        const ts = getTimestamp()
        storage.appendFile(path, new Blob([`ts=${ts} module=${module} log=${log} \r\n`]))
    }
}