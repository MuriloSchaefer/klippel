# E2E Headless Run — Process / Memory Leak Analysis

**Captured:** 2026-06-04
**Reporter symptom:** Running the e2e suite repeatedly with

```bash
ENV_NAME=benchmark BASE_WORKSPACE=empty \
  node scripts/devtools/repeat-tests.mjs test:e2e:headless 15
```

freezes the machine around the **4th–5th iteration** at the ~30 GB RAM ceiling.
`ps`/`top` during the freeze show **many `Xvfb` processes and Electron threads**
that should no longer exist — i.e. processes from earlier iterations were never
reaped and accumulate run-over-run.

> Status: **analysis only**. No fixes applied. Hypotheses are ranked by
> confidence with the evidence behind each and the instrumentation that would
> confirm or refute it.

---

## 1. How a single `test:e2e:headless` run spawns processes

`test:e2e:headless` = `KLIPPEL_USE_XVFB=1 jest` over the **whole** suite (no
`--testPathPatterns`), so it runs standalone *and* collaborative tests. Two
distinct process-spawning paths are active:

### A. Shared dev app (jest globalSetup / globalTeardown)

[jest.globalSetup.ts:151-195](webapp/jest.globalSetup.ts#L151-L195) boots one
shared app for standalone tests:

```
spawn("xvfb-run", ["-a", "--server-args=…", "npm", "run", "dev"], { detached: true })
  → xvfb-run (bash)         ← child.pid, process-group leader (detached:true)
      → Xvfb :N             (backgrounded by xvfb-run)
      → npm run dev
          → electron-vite dev --watch     (vite dev server + esbuild + file watchers)
              → electron (main)
                  → GPU process, zygote, renderer, utility procs
```

Teardown ([jest.globalTeardown.ts:74-112](webapp/jest.globalTeardown.ts#L74-L112)):
`Browser.close()` via CDP → `process.kill(-pid, SIGTERM)` → wait → `SIGKILL` →
finally `lsof -ti tcp:9222` and kill whoever still holds the CDP port. Because
the group leader is `detached:true`, the **group kill can reach the tree**, and
the `lsof :9222` fallback catches a re-parented main Electron. This path is the
**more** robust of the two.

### B. Collaborative peers (per-test harness)

Collaborative tests (`catalogConvergence`, `catalogInterference`,
`typeShareAndCreate`, …) each spawn their own peers in `beforeAll` and call
`harness.teardown()` in `afterAll`
([catalogConvergence.e2e.test.ts:103-139](webapp/src/system/modules/Materials/tests/collaborative/performance/catalogConvergence.e2e.test.ts#L103-L139)).
Each peer is a **full Electron under its own `xvfb-run`**
([collaborativeHarness.ts:223-246](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L223-L246)):

```
spawn("xvfb-run", ["-a", "--server-args=…", ELECTRON_BIN, "."], { detached: false })
  → xvfb-run (bash)        ← peer.process.pid, NOT a group leader (detached:false)
      → Xvfb :M            (its own auto-picked display, per peer)
      → electron (main) → GPU/zygote/renderer/utility
```

Plus one `jazz-run sync` node process per harness. `catalogConvergence` runs
2/3/4-peer describes; `catalogInterference` runs 2/3/5; `typeShareAndCreate`
runs 2. So a single jest run spawns **a dozen-plus** peer Electrons + their
Xvfbs over its lifetime, each torn down individually.

`maxWorkers: 1` ([jest.config.ts:7](webapp/jest.config.ts#L7)) means these are
sequential, so the leak is *cumulative residue*, not concurrent fan-out.

---

## 2. Root-cause hypotheses (ranked)

### H1 — Peer teardown kills the `xvfb-run` wrapper, which orphans both Xvfb and Electron — **PRIMARY, high confidence**

The peer cleanup path:

- [collaborativeHarness.ts:269-274](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L269-L274)
  `cleanupPeer` → `peer.browser.disconnect()` then `killChild(peer.process)`.
- [collaborativeHarness.ts:276-289](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L276-L289)
  `killChild` → `child.kill("SIGTERM")`, escalate to `SIGKILL` only if the
  child hasn't exited within 3 s.

`peer.process` is the **`xvfb-run` (bash) PID**, and the system `xvfb-run`
(`/usr/bin/xvfb-run`) **has no signal trap**. It runs the command in the
foreground and only kills Xvfb *after* it returns:

```sh
# /usr/bin/xvfb-run
DISPLAY=:$SERVERNUM XAUTHORITY=$AUTHFILE "$@"   # line 180 — foreground, blocks here
RETVAL=$?
kill $XVFBPID                                   # line 185 — only reached on normal return
```

Consequences of `SIGTERM` to that bash PID while it is blocked on line 180:

1. **bash terminates immediately** (default SIGTERM action) — it never reaches
   line 185, so **Xvfb is never killed**. → orphaned `Xvfb` per peer.
2. `kill PID` signals only bash, **not the process group** (peers are
   `detached:false`, so there is no dedicated group to signal and the code
   doesn't attempt `kill(-pid)` anyway). The foreground **Electron is
   reparented to init (PID 1) and keeps running**. → orphaned Electron
   (main + GPU + zygote + renderer + utility) per peer.
3. `killChild` observes bash exit within 3 s and **resolves as "cleaned up"**;
   the `SIGKILL` escalation never fires, and even if it did it would target the
   already-dead bash PID, not the orphans.
4. `browser.disconnect()` (not `close()`) only drops puppeteer's CDP socket; it
   **never asks Electron to quit**. Nothing in the path tells Electron to exit.
5. `cleanupPeer` then `rmSync`s the peer's `userDataDir`/`envDir` out from under
   the still-live orphan.

This single defect leaks **one Xvfb + one full Electron tree per peer, per
test, per run** — exactly "many Xvfb processes and threads / unclosed
processes," and the dominant RAM consumer (each loaded Electron is hundreds of
MB; a perf peer holding a synthetic catalog is more).

**Expected confirming evidence:** after a run, `ps -o pid,ppid,comm` shows
`Xvfb` and `electron` processes with **PPID = 1**; their count grows by ~the
number of collaborative peers each iteration.

### H2 — Orphans survive *between* `repeat-tests.mjs` iterations and accumulate — **high confidence (compounding factor)**

[repeat-tests.mjs:56-75](webapp/scripts/devtools/repeat-tests.mjs#L56-L75)
runs `npm run test:e2e:headless` 15× via `spawnSync`. Each iteration does its
own globalSetup/teardown, but H1's orphans are re-parented to init and are
**invisible to the next iteration's teardown** (teardown only knows its own
`pid` and the `:9222` holder). So orphans from iterations 1..k are all still
resident when iteration k+1 starts. Linear accumulation → the 4th–5th iteration
crosses the 30 GB ceiling. The runner has **no inter-run reaping and no memory
budget/abort**, so it drives straight into OOM/freeze.

The file header even documents the orphan-keeps-fd-open hazard for stdout, which
is the same class of problem (orphaned Electron inheriting handles).

### H3 — Shared dev app (globalSetup) leaks Xvfb / vite watchers on group-escape — **medium confidence (secondary)**

The shared-app teardown is stronger (group kill + `lsof :9222`), but:

- The `lsof :9222` fallback only reaps the **CDP-port holder** (main Electron).
  It does **not** target the **Xvfb**, the **electron-vite/esbuild dev server**,
  or GPU/utility subprocesses that may have `setsid`'d into their own
  session/group and escaped `kill(-pid)` — the teardown comment itself flags
  group escape as a known hazard
  ([jest.globalTeardown.ts:49-72](webapp/jest.globalTeardown.ts#L49-L72)).
- `electron-vite dev --watch` holds inotify watchers and worker threads; an
  orphaned vite contributes "many threads" and can also exhaust inotify
  instances over 15 runs.

Smaller per-iteration footprint than H1 (one tree vs many peers), but additive.

### H4 — `xvfb-run -a` allocates a fresh display per peer, multiplying orphaned X servers — **high confidence (mechanism detail, not independent)**

Because each peer (and the shared app) invokes `xvfb-run -a`
([collaborativeHarness.ts:216-233](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L216-L233)),
every orphaned wrapper from H1/H3 leaves behind a distinct `Xvfb :N`, its
`/tmp/.X{N}-lock`, and `/tmp/.X11-unix/XN` socket. This is *why* the symptom is
"many Xvfb processes" specifically, and it means orphaned Electrons lose their
display and may busy-loop/retry (extra CPU + memory churn) rather than exit.

### H5 — Intra-run renderer heap growth in the shared app — **low confidence (not the reported symptom)**

Standalone perf tests load 100/500/1000-material catalogs, scroll, search. If
pages/contexts aren't released between tests, the **single** shared renderer's
RSS climbs within a run. This is real but: (a) it's one process, freed when the
app is killed at teardown; (b) it doesn't explain *process count* growth or
*cross-run* accumulation. Likely a minor contributor at most; listed for
completeness.

---

## 3. Instrumentation to confirm

All three instruments below are **implemented** (read-only / env-gated; they
never send signals or change the kill path). The first is the decisive test for
H1/H2.

> **Key empirical lesson, baked into the tooling:** leaked test processes are
> **not reliably re-parented to init** — their `xvfb-run` ancestry often stays
> partly alive, so they keep a non-1 PPID. A naive "PPID == 1" filter misses
> them. And because this repo runs **inside VS Code (itself Electron)**, an
> unscoped `electron` match is swamped by the editor. The census therefore
> **scopes matches to the project path** and leads with the *project process
> count* (≈0 when idle), tracking PPID==1 only as a strict-orphan sub-metric.
> A single idle sample during this investigation already showed **304 leaked
> `Xvfb` + ~56 Electron processes + 313 `/tmp/.X*-lock` files** left by a prior
> frozen run — direct evidence of H1/H4.

### 3.1 Orphan / RSS monitor — `scripts/devtools/monitor-orphans.mjs` (decisive)

Continuous sampler. Run it in a second terminal (or backgrounded) for the
duration of the repeat loop:

```bash
node scripts/devtools/monitor-orphans.mjs --interval 5 &
ENV_NAME=benchmark BASE_WORKSPACE=empty \
  node scripts/devtools/repeat-tests.mjs test:e2e:headless 15
kill %1   # or Ctrl-C
```

Each line: `procs` (project-scoped Xvfb/Electron/jazz-run/dev-server count),
`rss` (their summed RSS, GiB), `threads`, `xlocks` (leaked Xvfb display locks),
`orphans(ppid=1)`, and a per-category breakdown. Streams to stdout and a
timestamped log under `.tests-executions/`. `--verbose` adds one line per
process; `--parent <pid>` / `--out <file>` override defaults. Shared snapshot
logic lives in [scripts/devtools/lib/processCensus.mjs](webapp/scripts/devtools/lib/processCensus.mjs).

**Expect (leak):** `procs`/`rss`/`xlocks` step up after each iteration and never
return to baseline. The breakdown attributes it (Xvfb + Electron ⇒ H1/H4; vite
⇒ H3).

### 3.2 Per-iteration census — `KLIPPEL_INSTRUMENT=1 repeat-tests.mjs`

The runner now brackets every iteration with a before/after census and prints a
per-run delta, when the flag is set (default behavior unchanged otherwise):

```bash
KLIPPEL_INSTRUMENT=1 ENV_NAME=benchmark BASE_WORKSPACE=empty \
  node scripts/devtools/repeat-tests.mjs test:e2e:headless 15
# → baseline + "run i before/after" + "run i delta: procs X→Y …",
#   also appended to .tests-executions/<stamp>_<script>_census.log
```

Ties the leak curve directly to iteration number. A clean harness returns
`after ≈ baseline` each run; the leak shows as a rising `after`.

### 3.3 Teardown audit — `KLIPPEL_TEARDOWN_AUDIT=1`

Logging-only audit wired into both teardown paths
([processAudit.ts](webapp/src/helpers/puppeteer/processAudit.ts)): it captures
each spawned root's full process tree (root + descendants, by PID) *before*
teardown and reports which PIDs are still alive *after* — i.e. what the kill
path failed to reap. Capturing PIDs up-front makes it robust to re-parenting.

- Collaborative peers: [collaborativeHarness.ts](webapp/src/helpers/puppeteer/collaborativeHarness.ts) `teardown()`.
- Shared dev app: [jest.globalTeardown.ts](webapp/jest.globalTeardown.ts).

```bash
KLIPPEL_TEARDOWN_AUDIT=1 ENV_NAME=benchmark BASE_WORKSPACE=empty \
  npm run test:e2e:headless
# → [teardown-audit] collaborativeHarness(perf-…): N SURVIVOR(s) … pid=… comm=Xvfb/electron
```

If teardown "succeeds" yet this lists survivors, H1 is proven directly, naming
the exact processes (Xvfb vs Electron) that leak.

### 3.4 A/B attribution experiments

Each isolates one variable; compare orphan census deltas:

| Experiment | Command change | Confirms |
|---|---|---|
| Headed vs headless | drop `KLIPPEL_USE_XVFB=1` | xvfb-run wrapper is the leak vector (H1/H4) |
| Exclude collaborative | `jest --testPathIgnorePatterns tests/collaborative` | peer harness vs shared app (H1 vs H3) |
| Single iteration | `repeat-tests … 1` | per-run footprint baseline vs accumulation (H2) |
| `close()` vs `disconnect()` | manual probe in a scratch script | graceful-quit gap (part of H1) |

### 3.5 inotify / fd pressure (supports H3)

```bash
for p in $(pgrep -d' ' -f 'vite|electron'); do
  ls -l /proc/$p/fd 2>/dev/null | grep -c anon_inode:inotify
done | awk '{s+=$1} END{print "inotify instances:", s}'
```

---

## 4. Possible fixes (ranked, not implemented)

Ordered by expected impact-to-effort. Items A–C target the primary cause (H1).

### A. Make peer teardown actually reap the tree (addresses H1) — **highest priority**

Combine, in order, in `cleanupPeer`/`killChild`
([collaborativeHarness.ts:269-289](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L269-L289)):

1. **Graceful quit first:** `browser.close()` (not `disconnect()`) so Electron
   tears down renderer → main → GPU in order via CDP, mirroring what the shared
   app teardown already does ([jest.globalTeardown.ts:22-33](webapp/jest.globalTeardown.ts#L22-L33)).
2. **Spawn peers `detached: true`** so each peer is its own process-group
   leader, then **kill the group** (`process.kill(-pid, …)`), SIGTERM→SIGKILL,
   reusing the existing `killGroup` helper
   ([jest.globalTeardown.ts:35-47](webapp/jest.globalTeardown.ts#L35-L47) —
   factor it into a shared util). Group kill reaches Xvfb + Electron + children
   even when the trap-less wrapper would otherwise abandon them.
3. **Post-kill sweep by marker:** verify no survivor matches the peer's
   `userDataDir`/`cdpPort`; if any remain, SIGKILL them before `rmSync`ing the
   dirs (and only `rmSync` after the process is confirmed dead).

### B. Own the Xvfb lifecycle instead of relying on `xvfb-run` (addresses H1/H4)

The trap-less wrapper is the core hazard. Options:

- Launch **`Xvfb` directly** with a harness-chosen display number, track its
  PID, point the peer Electron at `DISPLAY=:N`, and **kill Xvfb explicitly** in
  teardown. Removes the bash middleman entirely.
- Or run all peers under **one harness-owned Xvfb** with distinct display
  numbers (the per-peer-Xvfb choice was made to dodge a
  "two Electrons, one display → SIGILL" crash —
  [collaborativeHarness.ts:217-222](webapp/src/helpers/puppeteer/collaborativeHarness.ts#L217-L222);
  separate display *numbers* on a controlled server may avoid that without a
  wrapper per process).
- Or, if `xvfb-run` is kept, prefer a build that **traps signals** / forwards to
  the child, or invoke it so the wrapper is the group leader and group-kill it.

### C. Apply the same graceful-quit + broadened reap to the shared app (addresses H3)

Broaden teardown beyond the `:9222` holder: also reap the spawned tree's Xvfb
and the electron-vite/esbuild dev server (e.g. by process-group, by matching the
spawned `pid`'s descendants, or by a marker), not just the CDP-port listener.

### D. Defensive runner: reap between iterations + memory budget (addresses H2)

In `repeat-tests.mjs`:

- Run each iteration in its **own detached process group** and group-kill it
  after `spawnSync` returns (catches anything the in-jest teardown missed).
- **Inter-run orphan sweep:** before iteration k+1, detect and kill leftover
  `Xvfb`/`electron`/`vite` orphans (PPID 1) and stale `/tmp/.X*-lock`.
- **Abort on budget:** sample available RAM (or orphan RSS) between runs and
  stop with a clear error before the machine freezes, instead of OOMing.

This is a safety net, not a substitute for A–C; it keeps the harness from taking
the whole machine down while the real fixes land.

### E. Longer term: lighter shared app for perf runs

Booting a full `electron-vite dev --watch` (vite + esbuild + watchers) per
iteration is heavy and watcher-leaky. The `installedBin` path
([jest.globalSetup.ts:138-150](webapp/jest.globalSetup.ts#L138-L150)) drives a
prebuilt single Electron with no dev server — cheaper and fewer moving parts to
leak. Consider it for repeated perf runs.

---

## 5. Suggested validation sequence

1. Capture the **orphan census (3.1)** for the current code over a 15× run —
   establish the baseline leak curve and the per-`comm` breakdown.
2. Run the **A/B experiments (3.4)** to confirm the leak vanishes headed and
   shrinks dramatically when collaborative tests are excluded (locks the cause
   to H1 + the xvfb-run wrapper).
3. Prototype **fix A** behind the existing harness, re-capture 3.1 — orphan
   count should return to ~0 after each iteration.
4. Layer **fix D** as the standing safety net for the repeat runner.

---

## Appendix — key references

- Runner: [scripts/devtools/repeat-tests.mjs](webapp/scripts/devtools/repeat-tests.mjs)
- Shared-app boot/teardown: [jest.globalSetup.ts](webapp/jest.globalSetup.ts), [jest.globalTeardown.ts](webapp/jest.globalTeardown.ts)
- Peer harness: [collaborativeHarness.ts](webapp/src/helpers/puppeteer/collaborativeHarness.ts), [peerPool.ts](webapp/src/helpers/puppeteer/peerPool.ts)
- Jest config (`maxWorkers: 1`): [jest.config.ts](webapp/jest.config.ts)
- System `xvfb-run` (no signal trap): `/usr/bin/xvfb-run` lines 180/185
- Related: [src/docs/quality/e2e-tests.md](webapp/src/docs/quality/e2e-tests.md) §11, [src/docs/analysis/performance-tests.md](webapp/src/docs/analysis/performance-tests.md)
