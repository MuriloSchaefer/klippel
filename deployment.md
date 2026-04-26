# Deployment

## Overview

Klippel is an Electron desktop application released for Linux, macOS, and Windows. The release pipeline uses [electron-forge](https://www.electronforge.io/) for packaging and installer creation, and [semantic-release](https://semantic-release.gitbook.io/) for versioning and GitHub release management.

---

## Toolchain

| Tool | Role |
|---|---|
| `electron-vite` | Transpiles and bundles renderer + main process code |
| `electron-forge package` | Packages the app into platform-specific folder (no installer) |
| `electron-forge make` | Creates distributable installers from the packaged app |
| `electron-forge publish` | Publishes built artifacts to a target (e.g., GitHub Releases) |
| `semantic-release` | Determines version, generates changelog, creates GitHub release |

---

## Release Artifacts per OS

Each OS has its own installer format. Only the installer artifact — not the full build output — should be uploaded to releases.

| OS | Runner | Maker | Output artifact | Notes |
|---|---|---|---|---|
| Linux | `ubuntu-latest` | `maker-deb` | `Klippel-<version>.deb` | Primary target; installable via `dpkg` |
| Linux | `ubuntu-latest` | `maker-rpm` | `Klippel-<version>.rpm` | Secondary; installable via `rpm`/`dnf` |
| macOS | `macos-latest` | `maker-zip` | `Klippel-darwin-x64-<version>.zip` | Contains `.app` bundle; no signing yet |
| Windows | `windows-latest` | `maker-squirrel` | `KlippelSetup.exe` | Squirrel auto-updater compatible |

> **Marketplace readiness**: DMG (macOS App Store prep) and MSIX (Microsoft Store) makers are available in electron-forge but not yet configured. Code signing is required before submitting to either store.

---

## Known Problems (as of April 2026)

### 1. `package` instead of `make` in release workflow

The release workflow ([release-webapp.yaml](.github/workflows/release-webapp.yaml)) runs `npm run package`, which only creates a packaged app folder under `webapp/out/`. It does **not** create installable artifacts (`.deb`, `.exe`, etc.).

The e2e test workflow ([e2e-test.yaml](.github/workflows/e2e-test.yaml)) expects real installers and will never find them with the current release artifacts.

**Fix**: Change the release workflow to run `npm run make` instead of `npm run package`.

### 2. Entire `out/` folder is zipped and uploaded

After packaging, the workflow zips the full `webapp/out` directory and uploads it as a release artifact. This includes the packaged app folder tree (hundreds of files including all Electron binaries) rather than a single installer file.

**Fix**: After `make`, upload only the specific installer files from `webapp/out/make/`, not the full `out/` tree.

### 3. E2E downloads the OS zip and looks for installers inside it

The e2e workflow unpacks the release zip and searches for `.deb`/`.exe`/`.app` inside — a double-wrapping problem caused by issue #2 above.

**Fix**: Once `make` produces real installers and the release uploads them directly, the e2e workflow can download and run them without unpacking.

### 4. macOS e2e uses `zip` installer type but tests for `Klippel.app` inside it

`maker-zip` on Darwin wraps the `.app` bundle in a zip. The e2e test correctly unpacks it and checks for `Klippel.app`. This flow is valid but depends on `make` being called first.

---

## Target Release Process

```
┌─────────────────────────────────────────────────────────┐
│  Trigger: push to stable / workflow_dispatch            │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ubuntu-latest   macos-latest  windows-latest
    npm run make    npm run make   npm run make
          │              │              │
     .deb + .rpm    darwin .zip    Setup.exe
          └──────────────┼──────────────┘
                         ▼
                  upload-artifact
                (only make/ outputs)
                         │
                         ▼
               semantic-release job
               (ubuntu-latest only)
                  - bump version
                  - generate changelog
                  - create GitHub release
                  - attach per-OS installers
                         │
                         ▼
               trigger e2e-test workflow
```

---

## E2E Installation Testing

The e2e workflow ([e2e-test.yaml](.github/workflows/e2e-test.yaml)) is triggered manually or automatically after a release. It:

1. Resolves the release tag (latest or user-provided).
2. Downloads the platform-specific installer artifact from the GitHub release.
3. Installs it using native package managers / tools.
4. Launches the app and verifies the process starts.

### Required artifact names in GitHub release

The e2e workflow uses pattern matching to download artifacts. The release must attach files with predictable names:

| OS | Expected asset name pattern |
|---|---|
| Linux | `Klippel-*-linux.deb` |
| macOS | `Klippel-darwin-*.zip` |
| Windows | `KlippelSetup.exe` |

These names are determined by the electron-forge makers and should be surfaced as-is (not re-zipped into a generic `ubuntu-latest.zip`).

### E2E installation steps per OS

**Linux**
```bash
gh release download <tag> --pattern "*.deb" --dir artifacts/
sudo dpkg -i artifacts/*.deb
Klippel --no-sandbox &   # verify launch
```

**macOS**
```bash
gh release download <tag> --pattern "*darwin*.zip" --dir artifacts/
unzip artifacts/*.zip -d app/
open app/Klippel.app     # verify launch
```

**Windows (PowerShell)**
```powershell
gh release download <tag> --pattern "*.exe" --dir artifacts/
Start-Process artifacts/KlippelSetup.exe /S   # silent install
Start-Process "Klippel"                        # verify launch
```

### Appending e2e results to the GitHub release

After all installation tests complete, the `test-summary` job must edit the GitHub release body to append the test results. This requires `permissions: contents: write` on that job.

The appended section should follow this structure:

```markdown
---

## E2E Test Results

Tested: <UTC timestamp> · [Run details](<actions run URL>)

| OS | Installation |
|---|---|
| Linux | ✅ Passed / ⚠️ Check logs |
| macOS | ✅ Passed / ⚠️ Check logs |
| Windows | ✅ Passed / ⚠️ Check logs |
```

Implementation notes:
- Fetch the existing release body with `gh release view <tag> --json body` before editing, to avoid overwriting release notes produced by semantic-release.
- Use `gh release edit <tag> --notes "<existing body + e2e section>"` to append.
- The `INSTALLER_PATH` env var used by installation steps is set dynamically inside a run script; subsequent steps must read it from `$GITHUB_ENV`, not from `${{ env.INSTALLER_PATH }}` context expressions (which are evaluated before the step runs and will always be empty).

---

## Marketplace Publishing (Future)

### macOS App Store
- Requires Apple Developer account and code signing certificate.
- Add `maker-pkg` or configure `maker-dmg` in [forge.config.js](webapp/forge.config.js).
- Notarization must be done before submission (`electron-notarize`).
- `electron-forge publish` with a custom publisher or manual `xcrun altool` upload.

### Microsoft Store (MSIX)
- Requires Microsoft Partner Center account.
- Replace or supplement `maker-squirrel` with `maker-wix` or `maker-appx`.
- Package must be signed with a trusted certificate.

### Linux Stores (Snap / Flatpak)
- `electron-forge` does not have built-in Snap/Flatpak makers.
- Use `electron-builder` as an alternative for those targets, or add a manual post-package step.
- Snap: publish via `snapcraft` CLI; Flatpak: submit to Flathub manually.

---

## Packaging — Files to Include / Exclude

The `packagerConfig.ignore` list in [forge.config.js](webapp/forge.config.js) controls what is stripped from the package before creating installers. The goal is to ship only the compiled app — not source, dev config, or test files.

Currently ignored:
- `/src` — TypeScript source files
- `.eslintrc.json`, `.gitignore`, `electron.vite.config.ts`, `forge.config.cjs`, `tsconfig.*`

Should also be excluded (add to `ignore`):
- `node_modules` dev dependencies (electron-forge does this automatically via `prune: true`, but verify)
- Test files (`**/*.test.*`, `**/__tests__/**`)
- CI config (`.github/`)
- Build intermediate outputs (`dist/`, `out/` subdirectories not needed at runtime)
- `*.map` source map files in production builds

---

## Workflow Files

| File | Purpose |
|---|---|
| [.github/workflows/release-webapp.yaml](.github/workflows/release-webapp.yaml) | Build + package + release on all 3 OS |
| [.github/workflows/e2e-test.yaml](.github/workflows/e2e-test.yaml) | Install + launch test against a published release |
| [webapp/forge.config.js](webapp/forge.config.js) | electron-forge makers, publishers, and packager config |
| [webapp/release.config.js](webapp/release.config.js) | semantic-release plugins and asset attachment config |
