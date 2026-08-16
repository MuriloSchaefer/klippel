/**
 * OS-level handling for model attachments: write one to a user-chosen path, or
 * hand it to the desktop's default application.
 *
 * Separate from `models.ts` because none of this touches Jazz — the bytes are
 * already in hand by the time these run. Keeping the Electron `dialog` / `shell`
 * surface in its own file also keeps the one place that writes outside the
 * workspace easy to find.
 */
import { dialog, shell, app, BrowserWindow } from "electron";
import { writeFile, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface SaveDocumentAsInput {
  filename: string;
  bytes: ArrayBuffer | Uint8Array;
}

const toBuffer = (bytes: ArrayBuffer | Uint8Array): Buffer =>
  Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));

/**
 * Native save dialog, defaulted to the attachment's own filename. Resolves
 * `{ saved: false }` when the user cancels — a cancel is an outcome, not an
 * error, and the renderer should not have to catch to learn that.
 */
export async function saveDocumentAs(
  input: SaveDocumentAsInput,
): Promise<{ saved: boolean; path?: string }> {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
  const result = await (window
    ? dialog.showSaveDialog(window, { defaultPath: input.filename })
    : dialog.showSaveDialog({ defaultPath: input.filename }));
  if (result.canceled || !result.filePath) return { saved: false };
  await writeFile(result.filePath, toBuffer(input.bytes));
  return { saved: true, path: result.filePath };
}

/**
 * Write the attachment to a private temp directory and open it with whatever
 * the OS associates with its type.
 *
 * Note what this does: it puts a **decrypted copy outside the workspace**, in a
 * directory that survives until the OS cleans it. That is inherent to handing a
 * file to another application, but it is worth being explicit about — the
 * workspace's own encryption does not extend past this call. Each open gets its
 * own `mkdtemp` directory so two files with the same name cannot collide, and
 * so the copy is not left in a shared, world-listable path.
 */
export async function openDocumentExternally(
  input: SaveDocumentAsInput,
): Promise<{ opened: boolean; error?: string }> {
  const base = await mkdtemp(join(app?.getPath?.("temp") ?? tmpdir(), "klippel-doc-"));
  const target = join(base, input.filename);
  await writeFile(target, toBuffer(input.bytes));
  // `openPath` resolves to an error *string* (empty when it worked) rather
  // than rejecting.
  const error = await shell.openPath(target);
  return error ? { opened: false, error } : { opened: true };
}
