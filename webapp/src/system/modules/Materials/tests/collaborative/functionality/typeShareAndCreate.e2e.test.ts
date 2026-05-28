/**
 * Collaborative test — material types + materials sync between peers.
 *
 *   1. Peer A creates a shared workspace and Peer B joins.
 *   2. Peer B registers a new material type version (`teste@0.0.1`)
 *      with two attributes (`nome:string`, `peso:number`).
 *   3. Peer A waits for the type to arrive in the Jazz catalog and
 *      creates a material pinned to it.
 *   4. Peer B observes the new material on its side.
 *   5. Peer A registers a new version of the type (`teste@0.0.2`,
 *      adds `cor:color`).
 *   6. Peer B waits for the new version and adds a material pinned
 *      to it.
 *   7. Peer A observes the second material with the bumped schema
 *      version.
 *
 * Sync visibility uses the `window.electron.jazz.materials.load()`
 * IPC — that's the main-process view of the live catalog, so it
 * always reflects the latest Jazz state regardless of what the
 * renderer Redux store has cached. Once the IPC sees the new
 * type/material, we dispatch `loadMaterialsCatalog` on the renderer
 * to rehydrate the slices the forms read from.
 */
import {
  spawnCollaborativePeers,
  type CollaborativeHarness,
  type Peer,
} from "@helpers/puppeteer/collaborativeHarness";
import {
  openShareWorkspacePanel,
  readShareWorkspaceAttrs,
  confirmShareWorkspace,
} from "@kernel/modules/Store/components/drivers/shareWorkspace.puppeteer";
import {
  openNewWorkspacePanel,
  typeNewWorkspaceName,
  confirmNewWorkspace,
} from "@kernel/modules/Store/components/drivers/newWorkspace.puppeteer";
import {
  openJoinWorkspacePanel,
  fillJoinWorkspaceForm,
  confirmJoinWorkspace,
} from "@kernel/modules/Store/components/drivers/joinWorkspace.puppeteer";
import { addMaterialType } from "@system/modules/Materials/components/drivers/addMaterialType.click.puppeteer";
import { updateMaterialType } from "@system/modules/Materials/components/drivers/updateMaterialType.click.puppeteer";
import { addMaterial } from "@system/modules/Materials/components/drivers/addMaterial.click.puppeteer";
import { loadMaterialsCatalog } from "@system/modules/Materials/store/materials/actions";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";

let harness: CollaborativeHarness | null = null;
let peerA: Peer;
let peerB: Peer;
const SHARED_WS = `mat-collab-${Math.floor(Math.random() * 1e6)}`;
const TYPE_NAME = `teste${Math.floor(Math.random() * 1e6)}`;
const MAT_A = `mat-a-${Math.floor(Math.random() * 1e6)}`;
const MAT_B = `mat-b-${Math.floor(Math.random() * 1e6)}`;

const switchToMateriaisTab = async (peer: Peer) => {
  // `Materials/kernelCalls.ts :: startModule` registers the tab
  // asynchronously w.r.t. the harness's `#ribbon-menu-tabs` wait, so
  // poll until the label is in the DOM before clicking. Otherwise a
  // race can fire the click before the tab exists and silently
  // no-op.
  await peer.page.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(peer.page, undefined, "Materiais");
  if (!clicked) throw new Error('Materiais ribbon tab not found after wait');
  await peer.page.waitForSelector('[data-testid="open-add-material-type"]');
};

/**
 * Poll the live Jazz catalog through the main-process IPC until the
 * supplied predicate accepts the snapshot. The predicate is shipped
 * as a string and rebuilt inside the page context — `waitForFunction`
 * runs its callback in the browser, so closures from the test body
 * can't be captured. Uses `waitForFunction` so the suite-wide timeout
 * bounds the wait.
 */
const waitForCatalogIPC = async (
  peer: Peer,
  predicateFn: string,
) => {
  await peer.page.waitForFunction(
    /* istanbul ignore next */
    async (source: string) => {
      const snap = await window.electron.jazz.materials.load();
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      const predicate = new Function("snapshot", `return (${source})(snapshot)`);
      return Boolean(predicate(snap));
    },
    {},
    predicateFn,
  );
};

const rehydrateMaterials = async (peer: Peer) => {
  // Dispatch the `loadMaterialsCatalog` command through the exposed
  // dev store so the renderer's `materialTypes` + `materials` slices
  // reflect what the main process just synced. The middleware fires
  // `materialsCatalogLoaded` once the IPC returns.
  const type = loadMaterialsCatalog.type;
  await peer.page.evaluate((actionType: string) => {
    const store = (
      window as unknown as {
        __klippelStore__?: { dispatch: (a: { type: string }) => void };
      }
    ).__klippelStore__;
    if (!store) throw new Error("__klippelStore__ not exposed");
    store.dispatch({ type: actionType });
  }, type);
  // Settle the dispatch — wait for the type Select to render the new
  // option after the slice update. Polled via a small DOM probe so
  // the test doesn't race the next form open.
  await peer.page.waitForSelector('[data-testid="open-add-material-type"]');
};

beforeAll(async () => {
  harness = await spawnCollaborativePeers({
    count: 2,
    namePrefix: `mat-collab-${Date.now()}`,
    debug: process.env.KLIPPEL_DEV_LOG === "1",
  });
  [peerA, peerB] = harness.peers;

  // Peer A creates the shared workspace.
  await openNewWorkspacePanel(peerA.page);
  await typeNewWorkspaceName(peerA.page, SHARED_WS);
  await confirmNewWorkspace(peerA.page);

  // Peer A opens Share, reads the coId + syncUrl, confirms (syncOptIn).
  await openShareWorkspacePanel(peerA.page);
  const attrs = await readShareWorkspaceAttrs(peerA.page);
  expect(attrs.coId).toMatch(/^co_/);
  expect(attrs.syncUrl).toBe(harness!.sync.url);
  await confirmShareWorkspace(peerA.page);

  // Peer B joins by coId + syncUrl.
  await openJoinWorkspacePanel(peerB.page);
  await fillJoinWorkspaceForm(peerB.page, {
    coId: attrs.coId,
    syncUrl: attrs.syncUrl,
    name: `joined-${SHARED_WS}`,
  });
  await confirmJoinWorkspace(peerB.page);

  // Both peers land on the Materiais tab.
  await switchToMateriaisTab(peerA);
  await switchToMateriaisTab(peerB);
}, 180_000);

afterAll(async () => {
  if (harness) await harness.teardown();
});

describe("Materials catalog — collaborative sync", () => {
  it("peer B authors a type; peer A creates a material of that type", async () => {
    // Step 1 — peer B registers `<TYPE_NAME>@0.0.1`.
    await addMaterialType(peerB.page, {
      name: TYPE_NAME,
      version: "0.0.1",
      principal: "nome",
      extra: "peso",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
      ],
    });

    // Step 2 — peer A waits for the catalog to carry the new type.
    await waitForCatalogIPC(
      peerA,
      `(snap) => Object.values(snap.materialTypes).some(t => t.id === "${TYPE_NAME}@0.0.1")`,
    );

    // Rehydrate peer A's renderer slices so the Add-material form's
    // type Select renders the new entry.
    await rehydrateMaterials(peerA);

    // Step 3 — peer A creates a material of that type.
    await addMaterial(peerA.page, {
      id: MAT_A,
      type: TYPE_NAME,
      stockAmount: 10,
      attributes: { nome: "Material A", peso: 42 },
    });

    // Step 4 — peer B observes the new material with the right
    // schema version.
    await waitForCatalogIPC(
      peerB,
      `(snap) => {
        const m = snap.materials["${MAT_A}"];
        return Boolean(m) && m.schemaVersion === "0.0.1";
      }`,
    );
  }, 180_000);

  it("peer A bumps the type to 0.0.2; peer B adds a material on the new version", async () => {
    // Step 5 — peer A registers `<TYPE_NAME>@0.0.2` via the update form.
    await updateMaterialType(peerA.page, {
      typeName: TYPE_NAME,
      version: "0.0.2",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
        { name: "cor", kind: "color" },
      ],
    });

    // Step 6 — peer B sees the new version arrive.
    await waitForCatalogIPC(
      peerB,
      `(snap) => Object.values(snap.materialTypes).some(t => t.id === "${TYPE_NAME}@0.0.2")`,
    );
    await rehydrateMaterials(peerB);

    // Step 7 — peer B creates a material pinned to 0.0.2.
    await addMaterial(peerB.page, {
      id: MAT_B,
      type: TYPE_NAME,
      stockAmount: 7,
      attributes: { nome: "Material B", peso: 11 },
    });

    // Step 8 — peer A observes the new material with the bumped
    // schema version.
    await waitForCatalogIPC(
      peerA,
      `(snap) => {
        const m = snap.materials["${MAT_B}"];
        return Boolean(m) && m.schemaVersion === "0.0.2";
      }`,
    );
  }, 180_000);
});
