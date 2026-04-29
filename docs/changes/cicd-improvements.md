# CI/CD improvements — Windows runners

## Status (2026-04-29)

**Step 1 applied** — A, B, D, F, G, H, I landed in [.github/workflows/release-webapp.yaml](../../.github/workflows/release-webapp.yaml) and [.github/workflows/e2e-test.yaml](../../.github/workflows/e2e-test.yaml). Steps C (direct `node_modules` cache) and E (slim e2e zip) remain pending and will follow as separate PRs per the rollout plan below.

This document captures why the Windows leg of `Release Webapp` and `E2E Testing` is dramatically slower than the Linux/macOS legs (release recently took **>1h** on Windows) and lists concrete fixes ranked by expected impact.

Affected workflows:

- [.github/workflows/release-webapp.yaml](../../.github/workflows/release-webapp.yaml)
- [.github/workflows/e2e-test.yaml](../../.github/workflows/e2e-test.yaml)

---

## Why the Windows job is slow

GitHub-hosted `windows-latest` runners are notoriously the slowest tier for Node-heavy Electron builds. The Klippel pipeline hits every one of the well-known slow paths:

### 1. `npm ci` on NTFS with Defender on (≈10–25 min on its own)

`webapp/node_modules` contains tens of thousands of small files. Every file write is intercepted by Windows Defender real-time protection, and NTFS is an order of magnitude slower than ext4/APFS for many-small-files workloads. The same `npm ci` typically finishes in 60–90s on `ubuntu-latest` and 5–15+ min on `windows-latest`.

The current step does not pass any of the npm flags that skip work that does not matter in CI:

```yaml
- name: Install Dependencies
  run: npm ci
  working-directory: webapp
```

No `--prefer-offline`, `--no-audit`, `--no-fund`, no concurrency tuning. setup-node's npm cache helps the *download* phase, but the dominant cost is *extraction* of the cached tarball into `node_modules` — that is bounded by Defender + NTFS, not the network.

### 2. `@electron-forge/maker-squirrel` is the slow maker

Squirrel produces:

- `Klippel-Setup.exe`
- A `*-full.nupkg` (full release package)
- A `*-delta.nupkg` (delta against the previous release, when present)
- A `RELEASES` manifest

Each `.nupkg` is a NuGet zip; building them invokes 7-zip / nuget round-trips and recompresses the entire `app.asar` payload **twice** (once into the nupkg, once into `Setup.exe`'s embedded payload). On Windows this is single-threaded and dominated by Defender scanning every temp file Squirrel writes under `out/make/squirrel.windows/x64/`.

There is no equivalent step on Linux/macOS — `maker-deb`/`maker-rpm`/`maker-zip` are much cheaper.

### 3. `Compress-Archive` is extremely slow

```yaml
- name: Zip installers (windows)
  if: matrix.os == 'windows-latest'
  run: |
    $files = Get-ChildItem -Recurse -File webapp/out/make | Select-Object -ExpandProperty FullName
    Compress-Archive -Path $files -Destination webapp/${{matrix.os}}.zip
```

PowerShell's `Compress-Archive` is implemented on top of `System.IO.Compression` with a streaming pattern that is well known to be 5–20× slower than `7z` or `tar` on the same files. With Squirrel's full+delta `.nupkg` payloads (hundreds of MB), this single step routinely costs several minutes.

### 4. `actions/setup-node` cache is restored serially

The npm cache that setup-node restores is a single tarball that gets extracted into `~/.npm`. On Windows that extract is again Defender-bound. On a cache *miss* the whole step is a no-op, but on a cache *hit* the restore itself can take 1–3 min before `npm ci` even starts.

### 5. The release also rebuilds on Linux to run semantic-release

The `release` job on `ubuntu-latest` runs `npm ci` again purely to invoke `npx semantic-release`. This is fine in absolute terms (Linux is fast) but it is wasted work — semantic-release does not need the full dev dependency closure of the Electron app.

### 6. e2e Windows install step polls for up to 60s

```pwsh
Start-Process -FilePath $installer -Wait
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline -and -not (Test-Path $exePath)) {
  Start-Sleep -Seconds 2
}
```

[`e2e-test.yaml:264-272`](../../.github/workflows/e2e-test.yaml#L264-L272) — Squirrel runs install in the background after `Setup.exe` exits, so the poll is necessary, but the 60s ceiling is hit on every run (the installer typically completes well before that, but the loop's `Start-Sleep -Seconds 2` granularity plus Defender scanning the freshly-extracted `Klippel.exe` reliably eats the full window).

### 7. e2e uses `unzip` from Git Bash on Windows

`shell: bash` falls back to MSYS' `unzip`, which streams through the bash translation layer and is meaningfully slower than `Expand-Archive`/`tar -xf` for the same archive.

---

## Recommended changes

Ordered by expected impact on the Windows wall-clock, biggest wins first.

### A. Disable Defender real-time scanning on the workspace (single biggest win)

Add as the **first** step of every Windows job:

```yaml
- name: Disable Defender scanning on workspace
  if: runner.os == 'Windows'
  shell: pwsh
  run: |
    Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "${{ github.workspace }}" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionPath "$env:LOCALAPPDATA\npm-cache" -ErrorAction SilentlyContinue
    Add-MpPreference -ExclusionProcess "node.exe","npm.exe","7z.exe" -ErrorAction SilentlyContinue
```

This alone has been measured to cut Electron build pipelines on `windows-latest` by 30–50%. It is safe on ephemeral runners.

### B. Faster `npm ci` invocation

```yaml
- name: Install Dependencies
  run: npm ci --prefer-offline --no-audit --no-fund --loglevel=error
  working-directory: webapp
  env:
    npm_config_fund: "false"
    npm_config_audit: "false"
```

Marginal on Linux, meaningful on Windows because each skipped phase is itself slow there.

### C. Cache `node_modules` directly, not just the npm cache

Replacing setup-node's tarball cache with a direct cache of `webapp/node_modules` keyed on `package-lock.json` skips the extraction entirely on a hit:

```yaml
- name: Cache node_modules
  id: nm-cache
  uses: actions/cache@v4
  with:
    path: webapp/node_modules
    key: nm-${{ runner.os }}-${{ hashFiles('webapp/package-lock.json') }}

- name: Install Dependencies
  if: steps.nm-cache.outputs.cache-hit != 'true'
  run: npm ci --prefer-offline --no-audit --no-fund
  working-directory: webapp
```

Caveat: native modules under `node_modules/**/prebuilds/` are platform-specific, so the key must include `runner.os`. We are already platform-keyed via `runner.os`, so this is safe.

### D. Replace `Compress-Archive` with `7z` (or built-in `tar`)

Both are pre-installed on `windows-latest`:

```yaml
- name: Zip installers (windows)
  if: matrix.os == 'windows-latest'
  shell: pwsh
  run: 7z a -tzip -mx=3 webapp/${{matrix.os}}.zip ./webapp/out/make/*
```

`-mx=3` (fast compression) is plenty for already-compressed `.nupkg`/`.exe` payloads and shaves another 1–3 min.

### E. Stop shipping the delta `.nupkg` and `RELEASES` to the e2e zip

The e2e job only needs `Klippel-Setup.exe`. Today the zip carries the full nupkg, the delta nupkg (when present), and the `RELEASES` manifest, so we pay the compression cost on tens to hundreds of MB of artifacts that the consumer discards.

Two options:

1. **Cheapest:** filter at zip time —
   ```pwsh
   7z a -tzip -mx=3 webapp/windows-latest.zip ./webapp/out/make/squirrel.windows/x64/*Setup.exe
   ```
2. **Cleaner:** keep uploading the full Squirrel output as a separate artifact for auto-update purposes (when we wire that back up) and have e2e consume the slimmer artifact.

These nupkgs are needed by `update-electron-app` for auto-updates. If we still want them published to the GitHub Release for end users, do that via `@electron-forge/publisher-github` rather than smuggling them through the e2e zip.

### F. Tighten the e2e Windows install poll

Reduce sleep granularity and break out as soon as the file appears, with a shorter ceiling:

```pwsh
$deadline = (Get-Date).AddSeconds(30)
while ((Get-Date) -lt $deadline -and -not (Test-Path $exePath)) {
  Start-Sleep -Milliseconds 500
}
```

Also add the install dir to Defender exclusions before launching `Setup.exe` (covered by step A if the workspace exclusion is in place; `$env:LOCALAPPDATA\Klippel` is outside the workspace, so add it explicitly).

### G. Use `Expand-Archive` instead of bash `unzip` in the e2e verify step

The verify-installer step on Windows currently runs `unzip -q` under `shell: bash`. Switch to `Expand-Archive` (or `tar -xf`) under `pwsh` for the Windows branch and keep bash for the others.

### H. Pin `windows-2022` instead of `windows-latest`

`windows-latest` is in the middle of being rolled to `windows-2025`. Pinning protects cache hit rates and avoids one-off image-migration regressions.

### I. Add `concurrency` to the release workflow

Currently only `e2e-test.yaml` has a concurrency group. Re-running `Release Webapp` while a previous run is mid-build wastes a full Windows job:

```yaml
concurrency:
  group: release-webapp-${{ github.ref }}
  cancel-in-progress: false   # don't cancel an in-flight release, but queue
```

Use `cancel-in-progress: false` so we do not abort a half-published release; the goal is just to prevent two concurrent runs racing on the same tag.

### J. (Optional, larger refactor) Build the Windows installer on Linux

`@electron-forge/maker-squirrel` can run on Linux via Mono+Wine. Some projects move the Windows build off `windows-latest` entirely and cut wall-clock by 3–5×. This is a bigger change — code-signing and Squirrel quirks need verification — and is listed here only as a future option, not a near-term fix.

---

## Suggested rollout

1. Land **A + B + D + F + G + H** in a single PR — all are low-risk, no behavior change for consumers, and together should bring Windows release under 25 min.
2. Land **C** next as a separate PR so cache-key issues can be reverted in isolation if anything regresses.
3. Land **E** once we have decided how to publish nupkgs for auto-update (separate artifact vs. publisher-github).
4. Defer **J** until A–E are measured.

## How to measure

Compare the `Build and Make` and `Install Dependencies` step durations on the Windows leg before/after each PR via the Actions UI. Target numbers on `windows-latest`:

| Step | Today (observed) | Target |
|---|---|---|
| `Install Dependencies` | 8–15 min | < 3 min |
| `Build and Make` | 30–45 min | < 15 min |
| `Zip installers (windows)` | 2–5 min | < 30 s |
| `Test installation (Windows)` (e2e) | up to 90 s | < 30 s |

If Windows is still > 30 min after A–E, the next thing to investigate is what Squirrel itself is doing — `electron-forge make --verbose` will show whether the time is in `app.asar` packing, nupkg creation, or `Setup.exe` assembly.
