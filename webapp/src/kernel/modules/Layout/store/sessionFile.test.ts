/**
 * The guard around every `.session/` read.
 *
 * Worth its own test because the failure it prevents is invisible from inside
 * the app: these parses run while the store's initial state is being built, so
 * a throw leaves the renderer unmounted — a blank window, no error boundary,
 * nothing the user can click to recover. The zero-byte file in the first case
 * is not hypothetical; session writes are fire-and-forget, and an app that
 * quits right after a save leaves exactly that.
 */
import { parseSessionFile } from "./sessionFile";

describe("parseSessionFile", () => {
  const fallback = { restored: false };

  it("returns the parsed value for a good file", () => {
    expect(parseSessionFile('{"restored":true}', "a.json", fallback)).toEqual({
      restored: true,
    });
  });

  it("falls back on an empty file rather than throwing", () => {
    // The zero-byte file an interrupted save leaves behind.
    expect(parseSessionFile("", "a.json", fallback)).toBe(fallback);
    expect(parseSessionFile("   \n", "a.json", fallback)).toBe(fallback);
  });

  it("falls back on a truncated file rather than throwing", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(parseSessionFile('{"restored":tr', "a.json", fallback)).toBe(fallback);
    // Silently dropping a file the user's session depended on would turn a
    // recoverable bug into an unexplainable one.
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("a.json"));
    warn.mockRestore();
  });

  it("falls back when the file is missing altogether", () => {
    expect(parseSessionFile(null, "a.json", fallback)).toBe(fallback);
    expect(parseSessionFile(undefined, "a.json", fallback)).toBe(fallback);
  });
});
