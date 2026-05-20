# Jazz Scalability Analysis

> Scope: project the load profile of Klippel's planned Jazz.tools deployment against Jazz's architectural primitives and surface the failure modes we should design for **before** they hit production. Anchors:
>
> - **Concurrency:** dozens of concurrent users per workspace (target: 24–60 active peers).
> - **Static data:** ~1,000 `ModelCoMap` per workspace.
> - **Write rate:** 5,000 variations / month (≈ 167/day, bursty — peaks of 20–40/hour during work windows).
> - **Future state:** each variation becomes one **workflow execution** record. Workflow steps stream telemetry → 1–2 orders of magnitude more writes per variation than today's "save model" flow.
>
> Source-of-truth references: [user-management.md](../user-management.md), [Store/schema.ts](../../kernel/modules/Store/schema.ts), [Store change doc](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md), [electron/main/jazz.ts](../../../electron/main/jazz.ts).

---

## 1. Workload model

| Axis | Today (Phase 2c) | 12-month target | Workflow-engine state |
| --- | --- | --- | --- |
| Workspaces per device | 1 active | 1 active | 1 active |
| Concurrent peers per workspace | 1 (no sync yet) | 24–60 | 24–60 + headless executors |
| `ModelCoMap` per workspace | tens | 1,000 | 1,000 (specs) + N execution CoValues |
| Variations / month | n/a (no schema yet) | 5,000 | 5,000 workflow runs |
| Writes per variation | 1 (save) | 1 save + edits | 10–100 (step transitions, logs, artifacts) |
| Steady write rate (p50) | <1/min | ~3/min | 30–300/min |
| Burst write rate (p99) | <1/s | ~5/s | 50–200/s |
| SVG blobs | 1 per model (<1 MiB typical) | 1,000 SVGs | + per-step artifact blobs |

Even before the workflow pivot, **the system is two orders of magnitude past the current Phase-2c benchmark assumptions**, and the docs explicitly call out that "no benchmarks run yet" and the 500-model budget is the design target rather than a verified ceiling ([change doc, Performance](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L77-L82)).

---

## 2. How Jazz scales (and where it doesn't)

Jazz is a **CRDT runtime over an append-only mutation log** with per-CoValue history and gossip-style sync between peers. Every property below shapes what we can and can't do at the projected load.

### 2.1 Storage growth is super-linear in writes, not in state

Each `jazz.mutate` appends to `mutations` (see schema in [user-management.md §Layer 1](../user-management.md)). Materialized state is a projection. Implications:

- A single `ModelCoMap.graphJson` rewrite is **a full-graph payload** because `graphJson` is a `z.string()` (atomic LWW field, per [schema.ts:41](../../kernel/modules/Store/schema.ts#L41)). A 50-node graph at ~10 KiB JSON, edited 20 times during a session, leaves **200 KiB of history for 10 KiB of state** — a 20× amplification before compaction.
- Workflow executions multiply this: 5,000 runs × ~50 step writes × ~2 KiB/step ≈ **500 MiB/month of mutation log** per workspace, even if projected state is a few hundred MiB.
- Compaction is described as "monthly admin job" — at 50 MiB/day of WAL growth, **the WAL alone can outpace the `wal_autocheckpoint=1000` (≈4 MiB) cadence** during workflow bursts. WAL truncate runs on graceful shutdown, but our Electron app is not guaranteed to shut down gracefully (kill -9, crash, OS reboot).

**Risk:** unbounded `mutations` table. Compaction-cadence (monthly) is not aggressive enough once workflow execution lands.

**Mitigations to plan for:**

1. **Per-CoValue write-budget tracking.** Add a `mutation_count_since_compaction` counter (already implicit in `seq`); trigger compaction on a hot CoValue when its log exceeds N×snapshot-size, not on a calendar. The current monthly-job assumption is fine for static `ModelCoMap` but wrong for execution CoValues, which should compact per-run or be modeled as immutable.
2. **Immutable execution CoValues.** A workflow run is a finite, append-only audit trail. Once `status=completed`, freeze the CoValue (no further mutations allowed by Cedar policy) and offer it for archive/export. Don't compact what you can simply close.
3. **Externalize bulk telemetry.** Step logs, large stdout, intermediate artifacts → `BinaryCoStream` (or filesystem) rather than CRDT mutations. The CRDT log is a state machine, not a log sink.

### 2.2 Per-CoValue history must fit in RAM to mutate

Jazz materializes a CoValue's projected state in memory when any peer holds a live reference. The `WorkspaceCoMap` deep-resolves `models` + `editLease` on every IPC call right now ([change doc, Performance §2](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L77-L82)):

> `requireWorkspace()` re-loads the `WorkspaceCoMap` on every model IPC call. This is acceptable while we're below the plan's 500-model budget.

At 1,000 models this becomes **~2× the design budget on every IPC round-trip**. Each model is a CoMap with a `graphJson` string and an optional `fileStream`. Resolving 1,000 of these eagerly through `ModelsMap = co.record(z.string(), ModelCoMap)` ([schema.ts:47](../../kernel/modules/Store/schema.ts#L47)) means:

- The renderer keeps 1,000 metadata projections live in memory (name, id, updatedAt, etc.) — ~1–5 MiB, tolerable.
- The **main process Jazz node** keeps each CoValue's history available for sync — every active CoValue is a small object graph plus its mutation log. Even if individual histories are short, **1,000 × baseline overhead is real**.
- Each `requireWorkspace()` call walks the record. At dozens of users issuing list/load operations, this is a hot path.

**Mitigation:** lazy hydration (Phase 3 in the plan) is non-optional, not nice-to-have. Specifically:

- `listModels` must return a projection sourced from a denormalized index (e.g., a `ModelSummaryCoMap` per model containing only `{name, updatedAt, ownerId, status}`), not a `ModelsMap` deep-resolve.
- `loadModel` resolves a single `ModelCoMap` on demand and subscribes only that CoValue.
- Cache the loaded `WorkspaceCoMap` handle for the lifetime of the workspace session ([change doc explicitly defers this](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L79)) — re-resolving per IPC call is a footgun.

### 2.3 Sync fan-out is O(peers × mutations)

Jazz's sync model gossips mutations between peers that share a CoValue subscription. With 30 concurrent users:

- A single `updateModelGraph` write produces 29 outbound deliveries from the author plus 29×29 cross-validations (every peer runs the receive-validator on every incoming mutation) — **N² CPU work across the fleet** per mutation.
- The plan's perf budget is "Receive-validator end-to-end: < 10 ms per mutation at p95" ([user-management.md §Performance budgets](../user-management.md#L720-L726)). At 200 writes/s burst (workflow engine), that's 200 × 30 = **6,000 validations/s across the fleet**, ~60 s of CPU/s spread across 30 machines — feasible but only because the work is distributed.
- The "per-mutation rate limit: 200/s per workspace" cap ([same section](../user-management.md#L725)) is **shared, not per-user**. With 30 users, that's a ceiling of <7 writes/s per user before back-pressure. Workflow executors will trip this immediately during burst.

**Risks:**

- **Relay is opt-in and `disallowRelay: true` by default** ([change doc, Architectural decisions](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L62-L65)). Direct-peer (WebRTC) sync at 30 peers is an N² mesh — **untenable past ~8–10 peers**. We will need the Jazz Cloud relay (or a self-hosted equivalent) for any workspace with more than a handful of concurrent users. The "direct-peer-only by default" stance is correct for privacy/security but is **not the production topology** at this scale.
- The 200/s per-workspace cap needs to become **per-principal** plus a workspace-wide ceiling, or workflow executors will starve human editors.
- Receive-validator cost compounds with policy size. Cedar's `Authorizer cache` (keyed by `policyVersion, principal, action, resourceType`) is essential and must not be drained on every policy bump — coalesce policy edits aggressively.

### 2.4 Edit-lease contention

`EditLease` ([schema.ts:21-25](../../kernel/modules/Store/schema.ts#L21-L25)) is per-model and serializes writers to `graphJson`. This is correct given LWW semantics, but at scale it becomes a coordination bottleneck:

- **One editor per model at a time.** With 30 users and 1,000 models the math works on paper, but in practice activity concentrates on a few hot models. Two designers wanting to iterate on the same spec will see lease bounces, not collaborative editing.
- **60s TTL + on-focus renewal** means a backgrounded tab releases after 90s idle. Long review meetings where someone has the model open but isn't typing will drop the lease, then re-acquire on a stray focus event — visible UI thrashing in the lease banner.
- The lease check is currently **best-effort, not authoritative** ([change doc, Security](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L70-L73)) until the Phase-6 receive-validator lands. Until then, a determined renderer can bypass it.

**For the workflow-engine pivot:** workflow executions should **not** use the lease at all. An execution CoValue has a single writer (the executor) by construction; layering a lease on top adds latency and a failure mode for no isolation gain. Encode "only the executor can mutate" in Cedar policy + Jazz Group membership instead.

### 2.5 Re-key on demote is O(remaining members)

Plan §Re-key on demote: "O(remaining members) re-encryption per rotation. Policy edits batch through an 'Apply changes' gesture in `PolicyEditor`." ([user-management.md](../user-management.md#L87-L95))

At 30 members this is fine (one rotation = 30 envelope re-encryptions). At 60 it's still fine. The risk surface:

- **Rotation triggered by mistake** in a large workspace is expensive and disruptive — every peer must reconcile a new key epoch, which invalidates the Cedar authorizer cache for every active workspace user.
- **Rotation frequency** matters more than cost-per-rotation. If admin tools allow accidental rapid edits, we'll see N×K rotations rather than 1.

**Mitigation:** the "Apply changes" batching gesture in `PolicyEditor` is the right primitive; treat it as a hard requirement, not a UX nicety. Add a confirmation modal showing "this will rotate the workspace key — N members will reconnect" so accidental triggers are visible.

### 2.6 Quarantine table grows with attack surface, not with healthy traffic

`quarantine` is sized by **rejected** mutations. At healthy steady state this is near zero. But:

- A misbehaving renderer build (or a stale client after a policy bump) can dump rejected mutations at the full 200/s rate limit. The receive-validator catches them, but they accumulate in the `mutations` table (CRDTs are append-only — quarantine doesn't delete, only filters projection).
- 30-day GC + export-to-disk runs on the "admin with the freshest keyEpoch heartbeat" ([user-management.md §quarantine.ts](../user-management.md#L306-L309)). If no admin is online for 30+ days, GC stalls and quarantine grows unbounded.

**Mitigation:** make GC tolerant to absent admins — any peer with `Authz::exportQuarantine` capability + a successful export should be allowed to advance the GC watermark. The current "admin with freshest heartbeat" rule is fragile for a 30-person workspace where the one admin goes on vacation.

### 2.7 SQLite + WAL under sustained writes

`electron/main/jazz.ts` sets `journal_mode=WAL`, `synchronous=NORMAL`, `wal_autocheckpoint=1000` (default ~4 MiB), `mmap_size=256 MiB`, `cache_size=64 MiB`. These are good defaults for a single-user app. Under workflow-engine load:

- **WAL growth between checkpoints** at 200 writes/s × few-KiB payloads = ~1 MiB/s. Autocheckpoint fires every ~4 s in steady state — fine, but the checkpoint blocks for the duration of the flush. On a slow disk (HDD, network-mounted home dir), this is visible latency.
- **`busy_timeout=5000`** is a single-process app's safety net. Inside one Jazz node it's fine. If we ever introduce a sidecar process (background sync agent, workflow executor), **the `.db.lock` design forbids it by construction**. That's a correct choice for now but is a hard ceiling on parallelism: **one OS process per workspace can write SQLite**.
- **Backup / `VACUUM INTO`** on a multi-GB DB is minutes-long and blocks writes. Schedule outside work hours; surface it explicitly to admins.

### 2.8 Workspace-level isolation is a feature *and* a ceiling

Per-workspace SQLite + per-workspace Jazz node ([change doc, Phase 1](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md)) is excellent for blast-radius, backup, and the `.db.lock` single-writer guarantee. But:

- **Cross-workspace operations are not free.** Copying a model from workspace A to workspace B requires loading both nodes; given the lock, that means closing A or B first or running them in separate Electron instances.
- **One workspace per user-session** is also a ceiling: a workflow that spans workspaces (e.g., a shared materials catalog referenced from many project workspaces) cannot exist without a "global" CoValue and a parent Jazz node, which the current design doesn't have.

**Recommendation:** before the workflow engine lands, design a **shared-resources workspace** pattern (read-only materials/templates referenced from project workspaces) and a clear "import" semantics for cross-workspace copy. Don't try to dodge the single-workspace-per-node model — design within it.

---

## 3. Workflow-engine evolution: the specific risks

When each of the 5,000/month variations becomes a workflow execution, the load profile shifts qualitatively, not just quantitatively.

### 3.1 Write rate: 10–100× current target

A workflow run is a state machine with O(10) step transitions and O(10–100) telemetry events. At 5,000/month:

- **Baseline:** 5,000 × 50 events = **250,000 mutations/month** ≈ 100/min average, peaks 10× higher.
- **CRDT log growth:** at ~2 KiB/event, 500 MiB/month of mutations per workspace. Without per-run compaction or externalized logs, the DB will reach **multi-GB scale within a year**, well past the point where `VACUUM` is a quick operation.

### 3.2 Headless executors are first-class peers

Today every Jazz node is a human's Electron renderer. Workflow executors will be **headless processes** that:

- Hold their own `KlippelAccount` (one per executor, ideally) — adds to the principal count for Cedar evaluation and re-key cost.
- Subscribe to specific `WorkflowRunCoMap` instances and write at sustained 1–10 Hz per active run.
- Will hit `jazz-mutate` rate limits if the cap stays at 200/s per workspace. **Make the rate limit per-principal-class** (human / executor / admin) or scope it to the resource (per-run cap of 50/s, workspace cap of 500/s).

### 3.3 Reactivity-driven UI under bursty writes

If a designer is watching a live run, every step transition triggers a Jazz subscription callback → Redux selector → React re-render. At 10 Hz with 30 live observers, the renderer-side cost is 30 × 10 = 300 reflows/s **per workspace**. Two mitigations:

- **Coalesce subscription emissions** in the preload bridge: debounce same-coId updates to 10–30 Hz max.
- **Project to a derived "summary" CoMap** for the run-list UI; subscribe to the full run only when a user opens its detail panel.

### 3.4 Audit & retention obligations grow with workflow scope

Workflow executions are likely the artifact users care about for compliance / reproducibility. The CRDT log is naturally a perfect audit trail — **don't compact it away the way we plan to for `ModelCoMap.graphJson`**. Compaction policy for execution CoValues should be:

- **Never compact incomplete runs.**
- **Snapshot + freeze on completion** (status → terminal). Keep the snapshot in the workspace; offload the full mutation log to disk archive (`<workspace>/archive/runs/{runId}.jsonl`) if it exceeds N MiB.
- **Per-run retention policy** driven by Cedar (or a metadata field): some runs are compliance-critical and kept forever; others are short-lived and GC'd at 30 days.

This is **incompatible with the current "monthly admin compaction" sketch in [user-management.md §Backup](../user-management.md#L506-L509)** — workflows need per-CoValue lifecycle, not a global sweep.

---

## 4. Concrete failure modes to design tests for

Each row is a hypothesis we should be able to reproduce and assert on before claiming the system handles the target load.

| # | Failure mode | Trigger | Symptom | Test ask |
| --- | --- | --- | --- | --- |
| F1 | WAL bloat | Sustained 200 writes/s for >5 min, no graceful shutdown | `jazz.sqlite-wal` > 100 MiB; recovery slow | Synthetic write-burst harness; kill -9; measure restart time |
| F2 | Workspace-load > budget | 1,000 models, cold open | metadata IPC > 200 ms | E2E that seeds 1k `ModelCoMap` rows via direct SQLite + measures `jazz-list-models` |
| F3 | Lease thrash | Two users co-viewing a model with sporadic focus changes | Lease banner flickers, ghost holders | Driver-level test with two pages alternating focus every 30s |
| F4 | Receive-validator backlog | One peer publishes 1,000 mutations in a burst | Other peers' validator queues grow; UI stalls | Headless multi-peer harness measuring queue depth |
| F5 | N² peer mesh collapse | 15+ peers, no relay | Connection failures, missed updates | Synthetic peer pool; assert each peer converges on shared state |
| F6 | Cedar cache stampede | Admin issues rapid policy edits | `policyVersion` bumps drain authorizer cache; CPU spike across fleet | Apply N edits in T seconds; measure validator p95 |
| F7 | Quarantine GC stall | No admin online for 30 days | `quarantine` rows past TTL | Time-skip test: advance clock past TTL with no admin presence |
| F8 | History bloat on hot model | Single model edited 1,000× | `mutations` rows for that coId > 10k | Repeated `updateModelGraph` script; assert compaction triggers |
| F9 | BinaryCoStream churn | SVG re-upload on every edit | Multiple stream chunks per model; storage growth | Driver re-saves SVG 100× with identical bytes; assert dedup or compaction |
| F10 | Rate-limit starvation | Executor sustains 50 writes/s | Human editor's writes are throttled | Concurrent human + executor harness; assert SLO per principal class |

---

## 5. Action items (prioritized)

These are **prerequisites for the load profile in §1**, ordered by what unblocks the next.

1. **Land Phase 3 lazy hydration before crossing ~250 models.** The current `requireWorkspace()` re-resolves the full `ModelsMap` per IPC call ([change doc, Performance §2](../../kernel/modules/Store/docs/changes/2026-05-16-932980-jazz-foundation-and-models-migration.md#L79)); at 1k models this is a real bottleneck. Add a denormalized `ModelSummaryCoMap` so `listModels` is O(summaries), not O(models).
2. **Stand up the Jazz Cloud relay** (or self-hosted equivalent) and treat `disallowRelay: false` as the production default for shared workspaces. Direct-peer is fine for 1–5 peers; not for 30. Document the security tradeoff in `WorkspaceShare.tsx`.
3. **Per-principal-class rate limits** instead of the flat 200/s workspace cap. Humans, executors, and admins have very different bursty profiles.
4. **Compaction-on-threshold** (mutations-since-snapshot ≥ N×snapshot-size) instead of monthly admin compaction. Mandatory before workflow executions land.
5. **Design `WorkflowRunCoMap` lifecycle.** Immutable-on-completion, snapshot-on-freeze, archive-on-retention-expiry. Do **not** model executions as just another `ModelCoMap`.
6. **Externalize bulk telemetry** to `BinaryCoStream` or disk. The CRDT log is not a logging system.
7. **Authorizer cache hardening.** Coalesce policy edits in `PolicyEditor` (already specified); add a cache-warming pass on `policyVersion` bump to avoid the validator cliff.
8. **Quarantine GC fallback.** Any peer with `exportQuarantine` capability + a successful export should advance the watermark, not only "admin with the freshest heartbeat."
9. **Subscription coalescing in preload.** Debounce same-coId updates to ≤30 Hz before they hit the renderer.
10. **Benchmark harness.** Tests F1–F10 above; gate further Phase work on having red/green signal for the projected load.

---

## 6. What this analysis does *not* cover

- **Jazz Cloud / relay capacity & SLA.** Out of our control; needs vendor conversation or self-hosted plan.
- **Cross-device account sync** (account-seed export/import, multi-device merge of `KlippelAccount.root`). Separate concern; not load-bearing for the per-workspace ceilings above.
- **Cedar policy authoring complexity** at scale (100s of roles). Today's plan assumes a handful of role tiers.
- **Disk encryption (SQLCipher) overhead.** Off by default; ~5–15% throughput hit if enabled — measure before turning on.
- **Network partition recovery.** Jazz handles it by design (CRDTs converge), but a long-partitioned peer rejoining a workspace with a year's worth of mutations is a UX question we haven't answered (progress UI, partial hydration, etc.).

These are deliberate scope cuts — they belong in their own analyses once the in-scope ceilings above are resolved.
