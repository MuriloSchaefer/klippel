#!/usr/bin/env node
/**
 * Build the standalone MCP test bundle.
 *
 * Produces `webapp/out/test-bundle/` containing:
 *   - all `*.test.ts`, `*.puppeteer.ts`, and `*ShortcutHint*` files from src/
 *   - jest config + setup files
 *   - tsconfig.json
 *   - a slim package.json with only what jest + ts-jest + puppeteer-core need
 *   - launcher scripts (run-tests.sh / run-tests.cmd) that take the installed
 *     Klippel binary path and invoke jest with KLIPPEL_BIN_PATH set
 *
 * The bundle is what ships as `klippel-tests-<os>.zip` alongside each release.
 * It runs `npm install` inside the bundle so the artifact is self-contained.
 */

import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'glob';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webappRoot = resolve(__dirname, '..');
const outDir = join(webappRoot, 'out', 'test-bundle');

console.log(`[test-bundle] webapp root: ${webappRoot}`);
console.log(`[test-bundle] output dir:  ${outDir}`);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 1. Copy test files + their puppeteer driver siblings, preserving src/ layout.
//    We copy the broader src/ subset so test imports still resolve.
const filesToCopy = await glob(
  ['src/**/*.test.ts', 'src/**/*.puppeteer.ts', 'src/**/*.ts', 'src/**/*.tsx', 'src/**/fixtures/**/*'],
  { cwd: webappRoot, absolute: false, nodir: true },
);

console.log(`[test-bundle] copying ${filesToCopy.length} source files`);
for (const rel of filesToCopy) {
  const src = join(webappRoot, rel);
  const dest = join(outDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

// 2. Copy electron/main subset that tests mock or import from.
const electronFiles = await glob(['electron/**/*.ts'], {
  cwd: webappRoot,
  absolute: false,
  nodir: true,
});
for (const rel of electronFiles) {
  const src = join(webappRoot, rel);
  const dest = join(outDir, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}

// 3. Copy jest config + tsconfig.
for (const f of ['jest.config.ts', 'jest.setup.ts', 'jest.globalSetup.ts', 'jest.globalTeardown.ts', 'jest.screenshotEnv.cjs', 'tsconfig.json']) {
  cpSync(join(webappRoot, f), join(outDir, f));
}

// 4. Generate slim package.json. Pull versions from the main package.json so
//    they stay in sync.
const mainPkg = JSON.parse(readFileSync(join(webappRoot, 'package.json'), 'utf8'));
const pick = (name) => mainPkg.devDependencies?.[name] ?? mainPkg.dependencies?.[name];
const must = (name) => {
  const v = pick(name);
  if (!v) throw new Error(`Cannot find ${name} in webapp/package.json`);
  return v;
};

const slimPkg = {
  name: 'klippel-tests',
  version: mainPkg.version,
  private: true,
  description: 'Standalone MCP tools test runner for the installed Klippel app.',
  scripts: {
    test: 'jest',
  },
  dependencies: {
    jest: must('jest'),
    'ts-jest': must('ts-jest'),
    'ts-node': must('ts-node'),
    typescript: must('typescript'),
    'puppeteer-core': must('puppeteer-core'),
    '@types/jest': must('@types/jest'),
    '@types/node': must('@types/node'),
    '@jest/globals': must('@jest/globals'),
    'babel-jest': must('babel-jest'),
    'module-alias': must('module-alias'),
    '@swc/jest': must('@swc/jest'),
  },
};

writeFileSync(join(outDir, 'package.json'), JSON.stringify(slimPkg, null, 2));

// 5. README + launcher scripts.
const readme = `# Klippel MCP Tools Test Runner

This bundle runs the MCP tools test suite against an **installed** Klippel
binary. It ships alongside each Klippel release so CI and end users can verify
that an installed copy works on their machine.

## Usage

\`\`\`
# Linux / macOS
./run-tests.sh /path/to/installed/Klippel

# Windows
run-tests.cmd "C:\\Path\\To\\Klippel.exe"
\`\`\`

The runner spawns its own Electron instance from the binary you point it at,
exposes a CDP port, drives the UI through puppeteer, and reports jest results.
`;
writeFileSync(join(outDir, 'README.md'), readme);

const runShellScript = `#!/usr/bin/env bash
set -euo pipefail

if [ -z "\${1:-}" ]; then
  echo "usage: $0 <path-to-installed-klippel-binary>" >&2
  exit 2
fi

# Resolve to an absolute path before changing directories so relative paths
# passed by the caller still work.
case "$1" in
  /*) KLIPPEL_BIN_PATH="$1" ;;
  *)  KLIPPEL_BIN_PATH="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")" ;;
esac
export KLIPPEL_BIN_PATH
shift || true

cd "$(dirname "$0")"

if [ ! -d node_modules ]; then
  echo "[run-tests] installing dependencies..."
  npm install --omit=dev=false --no-audit --no-fund --loglevel=error
fi

if [ "$(uname)" = "Linux" ] && [ -z "\${DISPLAY:-}" ]; then
  export KLIPPEL_USE_XVFB=1
fi

exec npx jest "$@"
`;
writeFileSync(join(outDir, 'run-tests.sh'), runShellScript, { mode: 0o755 });

const runCmdScript = `@echo off
setlocal

if "%~1"=="" (
  echo usage: run-tests.cmd ^<path-to-installed-klippel.exe^>
  exit /b 2
)

set "KLIPPEL_BIN_PATH=%~1"
shift

cd /d "%~dp0"

if not exist node_modules (
  echo [run-tests] installing dependencies...
  call npm install --no-audit --no-fund --loglevel=error || exit /b 1
)

call npx jest %*
exit /b %ERRORLEVEL%
`;
writeFileSync(join(outDir, 'run-tests.cmd'), runCmdScript);

// 6. Run npm install inside the bundle so the artifact is self-contained.
console.log('[test-bundle] running npm install inside bundle...');
execSync('npm install --no-audit --no-fund --loglevel=error', {
  cwd: outDir,
  stdio: 'inherit',
});

console.log(`[test-bundle] done: ${relative(webappRoot, outDir)}`);
