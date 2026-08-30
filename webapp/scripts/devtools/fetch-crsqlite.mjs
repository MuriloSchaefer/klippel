/**
 * Fetch the cr-sqlite loadable extension for this platform.
 *
 * The extension is what turns the workspace tables into CRRs, which is what
 * `crsql_changes` — and therefore sync — is built on. It is **not committed**:
 * it is a ~2 MB native binary per platform, and vendoring four of them into
 * the repo would put them in every clone and every diff.
 *
 * **This runs at build time, never at run time.** A packaged app must work
 * offline, so the binary is fetched into `resources/crsqlite/<platform>-<arch>/`
 * (gitignored) and copied into the bundle by `forge.config.js` as an extra
 * resource. Forge's `generateAssets` hook calls this for the platform being
 * built, so packaging cannot silently produce an app with sync missing; the
 * npm scripts call it too, so a dev build has it as well.
 *
 * Pinned to v0.16.3 — the last tagged release (January 2024). The repository
 * is still maintained (build-matrix commits through 2026) but has not cut a
 * release since, so the pin is deliberate rather than lazy: moving off it
 * means building the extension ourselves. See §4 of
 * `src/docs/analysis/post-jazz-storage-study.md`.
 *
 *   node scripts/devtools/fetch-crsqlite.mjs
 */
import { createWriteStream } from "node:fs";
import { mkdir, rm, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const VERSION = "v0.16.3";
const BASE = `https://github.com/vlcn-io/cr-sqlite/releases/download/${VERSION}`;

/** Release asset per platform, and the file name the loader expects. */
const ASSETS = {
  "linux-x64": { asset: "crsqlite-linux-x86_64.zip", file: "crsqlite.so" },
  "linux-arm64": { asset: "crsqlite-linux-aarch64.zip", file: "crsqlite.so" },
  "darwin-x64": { asset: "crsqlite-darwin-x86_64.zip", file: "crsqlite.dylib" },
  "darwin-arm64": { asset: "crsqlite-darwin-aarch64.zip", file: "crsqlite.dylib" },
  "win32-x64": { asset: "crsqlite-win-x86_64.zip", file: "crsqlite.dll" },
};

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");

/**
 * Which platform to fetch for. Defaults to this machine; Forge passes the
 * target when cross-packaging, so a macOS build made on Linux gets the dylib
 * rather than the host's .so.
 */
function targetKey(argv = process.argv) {
  const read = (flag) => {
    const i = argv.indexOf(flag);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  const platform = read("--platform") ?? process.platform;
  const arch = read("--arch") ?? process.arch;
  return `${platform}-${arch}`;
}

export async function fetchCrsqlite(key = targetKey()) {
  const entry = ASSETS[key];
  if (!entry) {
    console.error(
      `[crsqlite] no prebuilt for ${key}. Supported: ${Object.keys(ASSETS).join(", ")}.\n` +
        `Build from source (github.com/vlcn-io/cr-sqlite) and place the ` +
        `extension at resources/crsqlite/${key}/.`,
    );
    process.exit(1);
  }

  const outDir = join(root, "resources", "crsqlite", key);
  const outFile = join(outDir, entry.file);
  if (existsSync(outFile) && !process.argv.includes("--force")) {
    console.log(`[crsqlite] already present: ${outFile}`);
    return;
  }

  await mkdir(outDir, { recursive: true });
  const url = `${BASE}/${entry.asset}`;
  console.log(`[crsqlite] downloading ${url}`);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`download failed: ${res.status} ${res.statusText}`);
  }
  const zipPath = join(outDir, entry.asset);
  await writeFile(zipPath, Buffer.from(await res.arrayBuffer()));

  // Unzip without adding a dependency: every target platform ships one of
  // these, and Python is already required by the build toolchain.
  const unzip = spawnSync(
    "python3",
    ["-c", `import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])`, zipPath, outDir],
    { stdio: "inherit" },
  );
  if (unzip.status !== 0) throw new Error("failed to extract the archive");
  await rm(zipPath);

  if (!existsSync(outFile)) {
    throw new Error(`archive did not contain ${entry.file}`);
  }
  const bytes = (await readFile(outFile)).byteLength;
  console.log(`[crsqlite] ${outFile} (${(bytes / 1e6).toFixed(1)} MB)`);
  return outFile;
}

// Only when run directly — importing this from the Forge hook must not
// trigger a fetch as a side effect.
if (process.argv[1] && process.argv[1].endsWith("fetch-crsqlite.mjs")) {
  fetchCrsqlite().catch((err) => {
    console.error("[crsqlite]", err);
    process.exit(1);
  });
}
