export type StorageAPI = {
    get: (path: string, mode: string) => File
}