/**
 * Phase 3 — collaborative join + cross-peer model visibility + lease banner.
 *
 * Two Electron peers spawned via the harness, connected through a local
 * cojson sync server. Drives the UI exclusively through MCP tools — same
 * rule as every other e2e test in the repo. The MCP `getPage()` is mocked
 * to swap between the two peers' renderer pages via `actAs(peer)`, so a
 * single tool call routes to whichever peer is the current actor.
 *
 *   1. peer A creates a workspace + a model
 *   2. peer A shares the workspace (Share panel reveals coId + syncUrl)
 *   3. peer B joins peer A's workspace by pasting coId + syncUrl
 *   4. peer B sees the model from step 1
 *   5. peer B creates a model
 *   6. peer A sees the model from step 5
 *   7. peer A opens the model from step 1 (acquires edit lease)
 *   8. peer B opens the same model (acquireLease rejects, refresh detects
 *      held_by_other → LeaseBanner renders)
 *   9. peer B's save button is disabled while the lease is held by A
 *
 * IPC read-only probes (`listModels`, `getAccountId`) are used to assert
 * sync state; the e2e rules forbid `page.evaluate` *inside MCP tool
 * files*, not inside the test body.
 */
import {
  spawnCollaborativePeers,
  type CollaborativeHarness,
  type Peer,
} from "@helpers/puppeteer/collaborativeHarness";
import type { Page } from "puppeteer-core";

let harness: CollaborativeHarness | null = null;
let peerA: Peer;
let peerB: Peer;
let activePage: Page | null = null;
const PREFIX = `join-collab-${Math.floor(Math.random() * 1e6)}`;
const SHARED_WS = `shared-${Math.floor(Math.random() * 1e6)}`;
const MODEL_A = `mA-${Math.floor(Math.random() * 1e6)}`;
const MODEL_B = `mB-${Math.floor(Math.random() * 1e6)}`;

// Mock the MCP puppeteer module *before* any MCP tool import so the
// import-time `getPage` reference inside each tool resolves to the swap
// proxy below. `actAs(peer)` flips which peer subsequent MCP calls drive.
jest.mock("../../../../../../../../electron/main/mcp/puppeteer", () => ({
  getPage: () => {
    if (!activePage) {
      throw new Error("collaborative test: actAs(peer) not called before MCP tool execute");
    }
    return activePage;
  },
}));

import { createWorkspaceTool } from "@kernel/modules/Store/mcpTools/createWorkspace";
import { shareWorkspaceTool } from "@kernel/modules/Store/mcpTools/shareWorkspace";
import { joinWorkspaceTool } from "@kernel/modules/Store/mcpTools/joinWorkspace";
import { createModelTool } from "@system/modules/Composer/mcpTools/createModel";
import { openModelTool } from "@system/modules/Composer/mcpTools/openModel";
import { switchRibbonTabTool } from "@kernel/modules/Layout/mcpTools/switchRibbonTab";

const actAs = (peer: Peer) => {
  activePage = peer.page;
};

beforeAll(async () => {
  harness = await spawnCollaborativePeers({
    count: 2,
    namePrefix: PREFIX,
    debug: process.env.KLIPPEL_DEV_LOG === "1",
  });
  [peerA, peerB] = harness.peers;
  // Land each peer on the Composer tab where the model + workspace
  // controls live. Both peers boot to the default ribbon tab; the
  // workspace selector lives in a common tray but the open/create-model
  // affordances only render under Compositor.
  for (const peer of [peerA, peerB]) {
    actAs(peer);
    await switchRibbonTabTool.execute({ label: "Compositor" });
  }
}, 180_000);

afterAll(async () => {
  if (harness) await harness.teardown();
});

// Read-only sync assertions: poll the IPC until the named model appears
// in the peer's list. Using `waitForFunction` against `listModels` keeps
// this off `page.evaluate`-with-inline-callback (allowed in test files
// per the rules; only MCP tool files are forbidden from inline
// browser-evaluated callbacks).
const waitForModel = async (peer: Peer, id: string) => {
  await peer.page.waitForFunction(
    async (target: string) => {
      const models = await window.electron.jazz.listModels();
      return models.some((m) => m.id === target);
    },
    {},
    id,
  );
};

describe("Phase 3 — collaborative join + lease banner", () => {
  it("peer A creates + shares; peer B joins and sees peer A's model", async () => {
    // Step 1 — peer A creates workspace + model via MCP UI flows.
    actAs(peerA);
    await createWorkspaceTool.execute({ name: SHARED_WS });
    await createModelTool.execute({ name: MODEL_A, id: MODEL_A });

    // Step 2 — peer A opens Share and confirms.
    const shareResult = JSON.parse(
      (await shareWorkspaceTool.execute()).content[0].text,
    );
    expect(shareResult.success).toBe(true);
    expect(shareResult.coId).toMatch(/^co_/);
    expect(shareResult.syncUrl).toBe(harness!.sync.url);

    // Step 3 — peer B joins by coId + syncUrl.
    actAs(peerB);
    await joinWorkspaceTool.execute({
      name: `joined-${SHARED_WS}`,
      coId: shareResult.coId,
      syncUrl: shareResult.syncUrl,
    });

    // Step 4 — model from A surfaces on B (sync round-trip).
    await waitForModel(peerB, MODEL_A);
  }, 180_000);

  it("peer B creates a model and peer A sees it", async () => {
    // Step 5 — peer B creates via MCP.
    actAs(peerB);
    await createModelTool.execute({ name: MODEL_B, id: MODEL_B });

    // Step 6 — model surfaces on A.
    await waitForModel(peerA, MODEL_B);
  }, 90_000);

  it(
    "peer A opens model → peer B opens same model → lease banner + save disabled",
    async () => {
      // Step 7 — peer A opens the model. ModelViewport mounts, useEditLease
      // acquires the lease on mount.
      actAs(peerA);
      await openModelTool.execute({ modelName: MODEL_A });

      // Confirm A actually holds the lease before B tries to open. The
      // useEditLease hook's `acquireLease` IPC is the deterministic
      // signal (the banner is the renderer reaction, not the trigger).
      const accountA = await peerA.page.evaluate(() =>
        window.electron.jazz.getAccountId(),
      );
      await peerA.page.waitForFunction(
        async (args: { id: string; account: string | null }) => {
          const loaded = await window.electron.jazz.loadModel(args.id);
          return (
            !!loaded?.editLease &&
            loaded.editLease.holderAccountId === args.account &&
            loaded.editLease.expiresAt > Date.now()
          );
        },
        {},
        { id: MODEL_A, account: accountA },
      );

      // Step 8 — peer B opens the same model. acquireLease rejects, the
      // hook's refresh sees held_by_other, the banner appears with
      // peer A's account as the holder mirror.
      actAs(peerB);
      await openModelTool.execute({ modelName: MODEL_A });
      await peerB.page.waitForSelector('[data-testid="composer-lease-banner"]');
      const holder = await peerB.page.$eval(
        '[data-testid="composer-lease-banner"]',
        (el) => el.getAttribute("data-lease-holder"),
      );
      expect(holder).toBe(accountA);

      // Step 9 — save button reflects the read-only state via the
      // `data-disabled` mirror.
      await peerB.page.waitForSelector(
        '[aria-label="save-model"][data-disabled="true"]',
      );
    },
    180_000,
  );
});
