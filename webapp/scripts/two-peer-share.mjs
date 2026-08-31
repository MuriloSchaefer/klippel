#!/usr/bin/env node
/**
 * two-peer-share.mjs — auto-configure the "Debug Two Peers" compound so
 * Peer A and Peer B end up on the same workspace before the user
 * starts interacting with the app.
 *
 * Mirrors the share/join e2e at
 *   `src/system/modules/Composer/tests/collaborative/persistence/session-management/joinAndCollaborate.e2e.test.ts`
 * but talks to the *running* Electron instances launched by VS Code
 * (Peer A on CDP :9222, Peer B on :9223) instead of spawning its own
 * via `collaborativeHarness.ts`. Both servers are the compound's own
 * launches: the Jazz Sync Server (`ws://127.0.0.1:4242`) carries workspace
 * identity, and the Sync Relay (`ws://127.0.0.1:4300`) carries the catalog
 * and models. A peer needs both.
 *
 * Flow:
 *   1. Connect puppeteer to both peers (poll CDP until ready).
 *   2. Peer A: if no workspace matches `--workspace=<name>`, create it
 *      via the New-workspace panel; then select it.
 *   3. Peer A: open Share panel, read `data-share-coid` /
 *      `data-share-sync-url` mirrors, confirm (toggles `syncOptIn`).
 *   4. Peer B: skip if the same `coId` is already in
 *      `window.electron.jazz.listWorkspaces()` — re-runs of this script
 *      should be idempotent so the user can re-trigger after a partial
 *      failure. Otherwise open Join panel and submit.
 *   5. Verify both peers' Share button reflects the active workspace.
 *   6. Verify both peers' cr-sqlite relay is connected to the *same*
 *      room. Without this the session looks healthy right up until
 *      an edit silently fails to cross, which is the expensive way to
 *      find out.
 *
 * Usage:
 *   node webapp/scripts/two-peer-share.mjs
 *     [--peerA-cdp=9222] [--peerB-cdp=9223]
 *     [--workspace=shared] [--joined-name=shared]
 */
import puppeteer from "puppeteer-core";
import { setTimeout as sleep } from "node:timers/promises";

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), "true"];
  }),
);

const PEER_A_CDP = Number(argv["peerA-cdp"] ?? 9222);
const PEER_B_CDP = Number(argv["peerB-cdp"] ?? 9223);
const WORKSPACE = argv.workspace ?? "shared";
const JOINED_NAME = argv["joined-name"] ?? WORKSPACE;
const READY_TIMEOUT_MS = 120_000;

const log = (...m) => console.log("[two-peer-share]", ...m);
const warn = (...m) => console.warn("[two-peer-share]", ...m);

async function waitForCdp(port, deadlineMs) {
  const start = Date.now();
  while (Date.now() - start < deadlineMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`CDP never reached :${port} within ${deadlineMs}ms`);
}

async function connectPeer(port, label) {
  log(`waiting for ${label} CDP :${port} ...`);
  await waitForCdp(port, READY_TIMEOUT_MS);
  const browser = await puppeteer.connect({
    browserURL: `http://127.0.0.1:${port}`,
    defaultViewport: null,
  });
  const pages = await browser.pages();
  const page = pages.find((p) => p.url().includes("index.html")) ?? pages[0];
  if (!page) throw new Error(`${label}: no renderer page found on :${port}`);
  await page.waitForSelector("#ribbon-menu-tabs", { timeout: READY_TIMEOUT_MS });
  log(`${label} ready (CDP :${port})`);
  return { browser, page };
}

// ---- Workspace-selector helpers ------------------------------------

async function listWorkspaces(page) {
  return page.evaluate(() => window.electron.jazz.listWorkspaces());
}

async function currentWorkspaceName(page) {
  // The Select renders its current value as the displayed text inside
  // the combobox button. Read it directly to avoid round-tripping
  // through redux.
  return page
    .$eval('#workspace-selector', (el) => el.textContent?.trim() ?? "")
    .catch(() => "");
}

async function selectWorkspaceFromDropdown(page, name) {
  await page.click('#workspace-selector');
  // MUI renders the menu in a portal; pick by visible text.
  await page.waitForSelector('ul[role="listbox"]');
  const items = await page.$$('ul[role="listbox"] li[role="option"]');
  for (const item of items) {
    const text = (await item.evaluate((el) => el.textContent))?.trim();
    if (text === name) {
      await item.click();
      // Wait for the dropdown to close.
      await page
        .waitForSelector('ul[role="listbox"]', { hidden: true, timeout: 5000 })
        .catch(() => {});
      return true;
    }
  }
  // Nothing matched — close the menu.
  await page.keyboard.press("Escape");
  return false;
}

// ---- New-workspace panel -------------------------------------------

async function createWorkspace(page, name) {
  log(`A: creating workspace "${name}"`);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector('[data-testid="new-workspace-button"]');
  await page.click('[data-testid="new-workspace-button"]');
  await page.waitForSelector(
    '[role="pointer-panel-content"] [data-testid="new-workspace-panel"]',
  );
  const inputSel =
    '[data-testid="new-workspace-panel"] [data-testid="new-workspace-name"] input';
  await page.waitForSelector(inputSel);
  await page.click(inputSel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  await page.type(inputSel, name);
  await page.waitForSelector(
    '[data-testid="new-workspace-submit"]:not(:disabled)',
  );
  await page.click('[data-testid="new-workspace-submit"]');
  await page.waitForSelector('[data-testid="new-workspace-panel"]', {
    hidden: true,
  });
  await page.waitForSelector(
    '[data-testid="share-workspace-button"]:not(:disabled)',
  );
}

// ---- Share panel ----------------------------------------------------

async function readShareAttrs(page) {
  log("A: opening Share panel");
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector(
    '[data-testid="share-workspace-button"]:not(:disabled)',
  );
  await page.click('[data-testid="share-workspace-button"]');
  await page.waitForSelector(
    '[role="pointer-panel-content"] [data-testid="share-workspace-panel"]',
  );
  const attrs = await page.$eval('[data-testid="share-workspace-panel"]', (el) => ({
    coId: el.getAttribute("data-share-coid") ?? "",
    syncUrl: el.getAttribute("data-share-sync-url") ?? "",
  }));
  if (!attrs.coId || !attrs.syncUrl) {
    throw new Error(
      `Share panel missing coId/syncUrl mirrors (coId=${attrs.coId}, syncUrl=${attrs.syncUrl})`,
    );
  }
  log("A: share attrs", attrs);
  return attrs;
}

async function confirmShare(page) {
  await page.waitForSelector(
    '[data-testid="share-workspace-confirm"]:not(:disabled)',
  );
  await page.click('[data-testid="share-workspace-confirm"]');
  await page.waitForSelector('[data-testid="share-workspace-panel"]', {
    hidden: true,
  });
  log("A: share confirmed (syncOptIn=true)");
}

// ---- Join panel -----------------------------------------------------

async function fillJoinField(page, testid, value) {
  const sel = `[data-testid="join-workspace-panel"] [data-testid="${testid}"] input, [data-testid="join-workspace-panel"] [data-testid="${testid}"] textarea`;
  await page.waitForSelector(sel);
  await page.click(sel);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  await page.keyboard.press("Delete");
  await page.type(sel, value);
}

async function joinWorkspace(page, { coId, syncUrl, name }) {
  log(`B: joining workspace coId=${coId} as "${name}"`);
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForSelector('[data-testid="join-workspace-button"]');
  await page.click('[data-testid="join-workspace-button"]');
  await page.waitForSelector(
    '[role="pointer-panel-content"] [data-testid="join-workspace-panel"]',
  );
  await fillJoinField(page, "join-workspace-coid", coId);
  await fillJoinField(page, "join-workspace-sync-url", syncUrl);
  await fillJoinField(page, "join-workspace-name", name);
  await page.waitForSelector(
    '[data-testid="join-workspace-submit"]:not(:disabled)',
  );
  await page.click('[data-testid="join-workspace-submit"]');
  await page.waitForSelector('[data-testid="join-workspace-panel"]', {
    hidden: true,
  });
  await page.waitForSelector(
    '[data-testid="share-workspace-button"]:not(:disabled)',
    { timeout: 30_000 },
  );
  log("B: join confirmed");
}

// ---- Relay verification ---------------------------------------------

async function relayStatus(page) {
  return page.evaluate(async () => {
    const status = await window.electron.jazz.syncStatus();
    return status.relay ?? { enabled: false, room: null };
  });
}

/**
 * Wait until this peer's relay client is connected.
 *
 * Polled rather than read once: `attachSync` runs when the workspace database
 * opens, and the socket takes a moment more. A peer that never gets there is
 * reported with what it *did* have, because "enabled: false" (never opted in)
 * and "connected: false" (relay unreachable) are different problems.
 */
async function waitForRelay(page, label, deadlineMs = 30_000) {
  const start = Date.now();
  let last = { enabled: false, room: null };
  while (Date.now() - start < deadlineMs) {
    last = await relayStatus(page);
    if (last.enabled && last.connected) {
      log(`${label} relay connected: room=${last.room} site=${last.site?.slice(0, 8)}`);
      return last;
    }
    await sleep(500);
  }
  throw new Error(
    `${label} relay never connected within ${deadlineMs}ms — last status ${JSON.stringify(last)}`,
  );
}

// ---- Orchestration --------------------------------------------------

async function main() {
  let peerA;
  let peerB;
  try {
    [peerA, peerB] = await Promise.all([
      connectPeer(PEER_A_CDP, "Peer A"),
      connectPeer(PEER_B_CDP, "Peer B"),
    ]);

    // Step 1 — peer A: ensure the workspace exists + is selected.
    const aWorkspaces = await listWorkspaces(peerA.page);
    const aHasIt = aWorkspaces.some((w) => w.name === WORKSPACE);
    if (!aHasIt) {
      await createWorkspace(peerA.page, WORKSPACE);
    } else {
      const current = await currentWorkspaceName(peerA.page);
      if (current !== WORKSPACE) {
        log(`A: selecting workspace "${WORKSPACE}" (was "${current}")`);
        const picked = await selectWorkspaceFromDropdown(peerA.page, WORKSPACE);
        if (!picked) {
          warn(
            `A: could not pick "${WORKSPACE}" from dropdown — falling back to current "${current}"`,
          );
        }
      }
    }

    // Step 2 — peer A: open Share, capture coId + syncUrl, confirm.
    const shareAttrs = await readShareAttrs(peerA.page);
    await confirmShare(peerA.page);

    // Step 3 — peer B: skip if already joined to the same coId (idempotent
    // re-runs after a partial failure).
    const bWorkspaces = await listWorkspaces(peerB.page);
    const alreadyJoined = bWorkspaces.find((w) => w.coId === shareAttrs.coId);
    if (alreadyJoined) {
      log(
        `B: already joined coId=${shareAttrs.coId} as "${alreadyJoined.name}" — selecting it`,
      );
      await selectWorkspaceFromDropdown(peerB.page, alreadyJoined.name).catch(
        (err) => warn("B: dropdown select failed", err.message),
      );
    } else {
      // Avoid colliding with an existing peer-B workspace of the same
      // name — suffix with the last 6 chars of the coId so re-runs
      // against a dirty env don't trip the "Workspace already exists"
      // guard in main/jazz.ts.
      const conflict = bWorkspaces.some((w) => w.name === JOINED_NAME);
      const suffix = shareAttrs.coId.slice(-6);
      const joinName = conflict ? `${JOINED_NAME}-${suffix}` : JOINED_NAME;
      await joinWorkspace(peerB.page, {
        coId: shareAttrs.coId,
        syncUrl: shareAttrs.syncUrl,
        name: joinName,
      });
    }

    // Step 4 — both peers must be on the relay, in the same room. The share
    // and join flows above only prove Jazz agreed; the catalog and the models
    // travel somewhere else entirely.
    const [aRelay, bRelay] = await Promise.all([
      waitForRelay(peerA.page, "A"),
      waitForRelay(peerB.page, "B"),
    ]);
    if (aRelay.room !== bRelay.room) {
      throw new Error(
        `peers are on different relay rooms — A=${aRelay.room} B=${bRelay.room}`,
      );
    }
    if (aRelay.site === bRelay.site) {
      // Same site id means one env dir is being shared by both peers: they
      // would overwrite each other's changes rather than merge them.
      throw new Error(
        `both peers report site ${aRelay.site} — check ENV_NAME differs per peer`,
      );
    }

    log("done — both peers connected to the shared workspace");
    log(`relay room ${aRelay.room} @ ${aRelay.url}`);
  } finally {
    // `puppeteer.connect` keeps a live websocket to the browser. Detach
    // both before exit so the Electron processes (still owned by VS
    // Code's debug session) aren't blocked from shutting down on a
    // subsequent stop-all.
    if (peerA?.browser) await peerA.browser.disconnect().catch(() => {});
    if (peerB?.browser) await peerB.browser.disconnect().catch(() => {});
  }
}

main().catch((err) => {
  console.error("[two-peer-share] FAILED", err);
  process.exit(1);
});
