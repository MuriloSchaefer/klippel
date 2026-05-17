export type SyncStatus = "offline" | "syncing" | "synced";

export interface StoreState {
    sessionAutoSaveInterval: number | undefined
    selectedWorkspace: string
    workspaces: string[]
    workspaceCoIds: Record<string, string>
    accountId: string | undefined
    syncStatus: SyncStatus
}
