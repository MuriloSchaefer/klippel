---
id: 2026-05-01-eb94e4
name: Bundle MCP tests as separate executable, run in e2e workflow
description: Ship the Jest MCP tools test suite as a separate executable artifact alongside the app, and have the e2e workflow run it against the installed app on Ubuntu/macOS/Windows with a two-column summary.
status: partially implemented
modules: [.github/workflows]
---

## Context
The current `.github/workflows/e2e-test.yaml` only verifies that the released artifact installs and launches on each runner OS. It does not exercise the MCP tool surface end-to-end against the installed binary, so regressions in MCP tools (puppeteer drivers, shortcuts, electron-side handlers) can ship to a release without CI catching them.

We want the e2e pipeline to additionally run the Jest MCP-tools test suite against the installed Klippel app on all three target OSes, and surface a clear pass/fail signal alongside the existing installation check. The same test bundle is intended to be reused later to run self-tests on end-users' devices (post-install diagnostics / health checks), so CI must exercise exactly the artifact a user would install.

## Change
The MCP test suite ships as a **separate executable**, packaged independently from the main app and uploaded as its own GitHub release artifact alongside the OS installers. It always ships — there is no flag to disable it.

Build/packaging:
- Add a separate packaging step that produces a standalone test-runner executable per OS (`klippel-tests-linux`, `klippel-tests-macos`, `klippel-tests-windows.exe` or equivalent). The executable bundles Jest, the MCP tool tests, fixtures, puppeteer driver helpers, and a dedicated `node_modules` installed at package time (independent of the app's runtime dependencies).
- Upload each per-OS test-runner executable as a GitHub release artifact alongside the existing app installers (parallel to `ubuntu-latest.zip` / `macos-latest.zip` / `windows-latest.zip`).
- The test runner spawns its own Electron instance, but it must point at the **installed** Klippel binary on the host (not a copy bundled into the test runner). The runner takes the installed-app path as input (CLI arg or env var) and drives that exact binary via puppeteer.

In `.github/workflows/e2e-test.yaml`:
- After the existing install + launch steps in `test-installation`, download the matching per-OS test-runner artifact from the same release and execute it, pointed at the installed app path. Each matrix OS (`ubuntu-latest`, `macos-latest`, `windows-latest`) runs its own runner.
- Capture the test runner's exit code separately from the install/launch outcome and persist both into the per-OS status artifact (extend `status/${OS_KEY}.txt` or add a sibling field) so the aggregator job can read them.
- Update the summary aggregation job so the GitHub Actions job summary table has **two columns** per OS row:
  1. **Installation** — result of install + launch (existing).
  2. **MCP tools tests** — result of the bundled Jest runner.
- Each cell renders ✅ / ❌ / ⏭ (skipped) consistently across OSes.

Out of scope: end-user UI for invoking the test runner, or adding new MCP tool tests.

## Status notes
Partially implemented.

Done:
- `webapp/jest.globalSetup.ts` now spawns the installed binary directly when `KLIPPEL_BIN_PATH` is set (with `--remote-debugging-port` and `--no-sandbox` on Linux), falling back to `yarn dev` for local runs.
- `webapp/scripts/build-test-bundle.mjs` produces a self-contained `webapp/out/test-bundle/` with src + electron + jest config + slim `package.json` + `npm install`-ed `node_modules` + `run-tests.sh` / `run-tests.cmd` launchers (binary path passed as first arg).
- `npm run package:tests` script wired in `webapp/package.json`.
- `release-webapp.yaml`: builds the bundle on each OS, zips it, uploads as `klippel-tests-<os>.zip` artifact; release.config.js attaches all three to the GitHub release.
- `e2e-test.yaml`: downloads the per-OS tests zip from the release, extracts, runs the launcher pointed at the installed binary (Linux: `$KLIPPEL_BIN`, macOS: discovered from `$APP_PATH`, Windows: `$KLIPPEL_EXE`), captures the outcome.
- Summary table in `e2e-test.yaml` now has two columns: **Installation** (collapsed install+launch) and **MCP tools tests**.

Open / follow-ups:
- Validate the test-bundle build end-to-end on each OS (script copies a wide src subset to keep imports resolvable; this can almost certainly be trimmed once a real CI run reveals which files are actually needed).
- Tune timeout / retry policy for flaky puppeteer tests on Windows (currently 15-min hard timeout per OS leg).
- The launchers run `npm install` lazily on first use if `node_modules` is missing — review whether to skip this on CI (where the bundle already shipped with `node_modules`) vs. keep it for end-user diagnostics.

## Security
The test runner ships as a separate executable and is not part of the installed app surface, so the production app gains no new attack surface from this change. Considerations for the runner artifact itself:
- The runner can drive the installed app via puppeteer and spawn Electron child processes — distributing it publicly means anyone who downloads it can automate the local app. This is acceptable since the same automation is already possible by writing puppeteer scripts against the installed binary.
- Confirm the bundled `node_modules` inside the runner does not pull in unnecessary dev tooling beyond what Jest + puppeteer drivers require.

## Performance
- **App installer size**: unchanged. Tests are not bundled into the app installer.
- **Release artifact set**: three additional binaries (one per OS) uploaded per release. Size depends on packaging tool (typically tens of MB for a Node + Jest bundle).
- **CI wall-clock**: adds a Jest run per OS leg, expected a few minutes each. No impact on app runtime performance.
