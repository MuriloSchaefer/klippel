import { existsSync, readFileSync, outputFileSync } from "fs-extra";
import { getAbsPath } from "./storage";

export type WorkspaceIndexEntry = {
  name: string;
  coId: string;
  syncOptIn: boolean;
  syncUrl?: string;
};

const INDEX_PATH = "workspaces.index.json";

export function readWorkspacesIndex(): WorkspaceIndexEntry[] {
  const abs = getAbsPath(INDEX_PATH);
  if (!existsSync(abs)) return [];
  try {
    const raw = readFileSync(abs, { encoding: "utf-8" }).trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[workspacesIndex] failed to read index", err);
    return [];
  }
}

export function writeWorkspacesIndex(entries: WorkspaceIndexEntry[]): void {
  outputFileSync(getAbsPath(INDEX_PATH), JSON.stringify(entries, null, 2));
}

export function upsertWorkspace(entry: WorkspaceIndexEntry): WorkspaceIndexEntry[] {
  const entries = readWorkspacesIndex();
  const idx = entries.findIndex((e) => e.name === entry.name);
  if (idx >= 0) entries[idx] = entry;
  else entries.push(entry);
  writeWorkspacesIndex(entries);
  return entries;
}

export function findWorkspace(name: string): WorkspaceIndexEntry | undefined {
  return readWorkspacesIndex().find((e) => e.name === name);
}

export function removeWorkspace(name: string): WorkspaceIndexEntry[] {
  const entries = readWorkspacesIndex().filter((e) => e.name !== name);
  writeWorkspacesIndex(entries);
  return entries;
}
