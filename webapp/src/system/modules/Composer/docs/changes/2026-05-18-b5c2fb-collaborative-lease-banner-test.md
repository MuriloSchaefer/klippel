---
id: 2026-05-18-b5c2fb
name: collaborative lease banner e2e
description: First collaborative e2e test — when peer A acquires the edit lease on a model, peers B..N must render the LeaseBanner pointing at A's account.
status: draft
modules: [Composer, Store]
---

## Context

`LeaseBanner` ([LeaseBanner.tsx](webapp/src/system/modules/Composer/components/viewports/ModelViewport/LeaseBanner.tsx)) is the visible contract for "another peer is editing this model — your changes will be rejected." Today it is exercised only by unit-style assertions inside the renderer; nothing proves that when *peer A* actually acquires a lease, *peer B's* renderer flips its banner to the `held_by_other` state.

This is the canonical first collaborative test because it touches every layer that Phase 3 cares about:

- The multi-peer Jazz harness must sync a `WorkspaceCoMap`.
- The `EditLease` CoValue must propagate from holder to non-holder.
- `useEditLease` ([useEditLease.ts](webapp/src/system/modules/Composer/hooks/useEditLease.ts)) must observe the change and re-render `LeaseBanner`.

Depends on the collaborative Jazz multi-peer harness (sibling change doc in Store module, same `id`).

## Change

### Test file

New file: `webapp/src/system/modules/Composer/tests/collaborative/persistence/session-management/leaseBanner.e2e.test.ts`.

Shape:

```ts
beforeAll: spawnPeers(2) → [peerA, peerB]
            resetWorkspace(peerA, WS)
            create workspace + model M on peerA → coId
            joinWorkspaceOnPeer(peerB, WS, coId)
            both peers navigate to model M's viewport

it('peer B sees LeaseBanner when peer A holds the lease'):
  await peerA.evaluate(() => window.electron.jazz.acquireEditLease(M))
  await peerB.waitForSelector('[data-testid="composer-lease-banner"]')
  // assert banner shows peer A's account id prefix
  const text = await peerB.$eval(SEL, el => el.textContent)
  expect(text).toMatch(<first 12 chars of peerA accountId>)

it('peer B banner clears when peer A releases the lease'):
  await peerA.evaluate(() => window.electron.jazz.releaseEditLease(M))
  await peerB.waitForSelector('[data-testid="composer-lease-banner"]', { hidden: true })

afterAll: harness.teardown()
```

Rules followed (per [e2e-tests.md](webapp/src/docs/quality/e2e-tests.md)):

- Location: `tests/collaborative/persistence/session-management/` — collaborative because it exercises two peers; session-management because it asserts on lease lifecycle.
- No `timeout:` overrides on `waitForSelector`.
- No `setTimeout`/`waitForTimeout` sleeps. Wait on the banner selector for the appearance assertion, on `{ hidden: true }` for the clearance assertion.
- Banner already has `data-testid="composer-lease-banner"` — no component change needed for the assertion itself.

### Mirror attributes (likely needed)

To assert *which* account holds the lease without scraping prose, add a stable mirror on `LeaseBanner`:

- `data-lease-holder="<accountId>"` on the `Box` wrapper.

Without this the test would have to slice the visible text "Modelo em edição por XXXXXXXX…", which is brittle to copy changes. The mirror is one line in [LeaseBanner.tsx:14-18](webapp/src/system/modules/Composer/components/viewports/ModelViewport/LeaseBanner.tsx#L14-L18).

### Driver / helper additions

- `webapp/src/helpers/puppeteer/leaseControl.ts` — `acquireLease(page, modelId)`, `releaseLease(page, modelId)`. Thin wrappers over `window.electron.jazz.acquireEditLease`. Lives in helpers (cross-module) because both Composer and (eventually) Store tests will use it.
- No new driver under `Composer/components/.../drivers/` for this test — the lease is acquired through IPC, not a click. A future test will exercise the UI path that calls `acquireEditLease` and that one *does* need a click driver.

### Renderer hook prerequisite

`useEditLease` must already subscribe to `EditLease` changes on the loaded model and recompute `status` when the CoValue updates. Before writing the test, verify by inspection that it does — if it only reads the lease on initial load, fix that first (separate commit, same PR).

## Status notes

Draft.

Open items:

1. Whether `useEditLease` reactively observes lease changes or only reads on mount — verify before the test is wired, because a non-reactive hook would make the test fail for the wrong reason.
2. Model navigation in two peers — needs a tiny helper `navigateToModel(page, modelId)` if one doesn't exist. Check Composer drivers before adding.
3. Lease TTL is 60 s ([jazz.ts:339](webapp/electron/main/jazz.ts#L339)). The "banner clears on release" assertion must use `releaseEditLease`, not wait for expiry — otherwise it sleeps. Already accounted for in the test shape above.
4. The lease-holder mirror exposes an account id over CSS. That id is a public Jazz account identifier (already shown in the banner text); no new exposure, but call this out in review.

## Security

- New `data-lease-holder` attribute exposes the Jazz account id of the lease holder in the DOM. The same id is already rendered as visible text in the banner ([LeaseBanner.tsx:20](webapp/src/system/modules/Composer/components/viewports/ModelViewport/LeaseBanner.tsx#L20)), so this is not a new exposure surface.
- Test workspaces are temp env dirs; credentials never leave the harness.
- No new IPC surface in this change (uses existing `acquireEditLease` / `releaseEditLease`).

## Performance

- Test cost: 2 Electron peers boot (~6 s in parallel) + sync convergence (~ms over loopback). Total target: <30 s for the file.
- No production-path impact: adds one DOM attribute on a banner that only renders when a lease is held.
- Renderer reactivity: if `useEditLease` needs to start subscribing to lease updates (see Status notes), that is a small but real cost — one extra Jazz subscription per open model. Acceptable given the banner already depends on the same CoValue tree.
