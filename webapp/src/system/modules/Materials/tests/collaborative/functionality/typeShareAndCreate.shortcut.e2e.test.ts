/**
 * Collaborative test — keyboard-shortcut variant of
 * `typeShareAndCreate.e2e.test.ts`. Same scenario (peer B authors a
 * type, peer A creates a material; peer A bumps the type, peer B
 * adds a material on the new version) but the PointerContainers are
 * opened via the registered shortcuts:
 *
 *   q → Novo material      (Materials/Estoque/addMaterial)
 *   e → Novo tipo          (Materials/TiposDeMateriais/addType)
 *   r → Editar tipo        (Materials/TiposDeMateriais/updateType)
 *
 * Both shortcut bindings live in `Materials/kernelCalls.ts ::
 * postBootInitialization` and are only active while the Materiais
 * ribbon tab is the focused context — `switchToMateriaisTab` puts
 * each peer in that context before the test body runs.
 *
 * Sync visibility uses the `window.electron.jazz.materials.load()`
 * IPC; once it observes the cross-peer update, the test dispatches
 * `loadMaterialsCatalog` through the exposed dev store so the
 * renderer slices the forms read from are in sync.
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
import { addMaterialTypeViaShortcut } from "@system/modules/Materials/components/drivers/addMaterialType.shortcut.puppeteer";
import { updateMaterialTypeViaShortcut } from "@system/modules/Materials/components/drivers/updateMaterialType.shortcut.puppeteer";
import { addMaterialViaShortcut } from "@system/modules/Materials/components/drivers/addMaterial.shortcut.puppeteer";
import { loadMaterialsCatalog } from "@system/modules/Materials/store/materials/actions";
import { clickRibbonTab } from "@kernel/modules/Layout/mcpTools/drivers/switchRibbonTab.puppeteer";

let harness: CollaborativeHarness | null = null;
let peerA: Peer;
let peerB: Peer;
const SHARED_WS = `mat-collab-sc-${Math.floor(Math.random() * 1e6)}`;
const TYPE_NAME = `teste${Math.floor(Math.random() * 1e6)}`;
const MAT_A = `mat-a-${Math.floor(Math.random() * 1e6)}`;
const MAT_B = `mat-b-${Math.floor(Math.random() * 1e6)}`;

const switchToMateriaisTab = async (peer: Peer) => {
  // Wait for the Materials module to actually register the tab
  // before clicking — startModule runs asynchronously w.r.t. the
  // harness's `#ribbon-menu-tabs` readiness probe, so a naive click
  // can no-op silently. Then use the kernel's `clickRibbonTab`
  // driver and assert it actually clicked something.
  await peer.page.waitForFunction(() => {
    const tabs = Array.from(
      document.querySelectorAll<HTMLElement>('#ribbon-menu-tabs [role="tab"]'),
    );
    return tabs.some((t) => (t.textContent ?? "").trim() === "Materiais");
  });
  const clicked = await clickRibbonTab(peer.page, undefined, "Materiais");
  if (!clicked) throw new Error('Materiais ribbon tab not found after wait');
  // Confirm the tab's section actually mounted before letting the
  // body dispatch keystrokes.
  await peer.page.waitForSelector('[data-testid="open-add-material-type"]');
};

const waitForCatalogIPC = async (peer: Peer, predicateFn: string) => {
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
  await peer.page.waitForSelector('[data-testid="open-add-material-type"]');
};

beforeAll(async () => {
  harness = await spawnCollaborativePeers({
    count: 2,
    namePrefix: `mat-collab-sc-${Date.now()}`,
    debug: process.env.KLIPPEL_DEV_LOG === "1",
  });
  [peerA, peerB] = harness.peers;

  await openNewWorkspacePanel(peerA.page);
  await typeNewWorkspaceName(peerA.page, SHARED_WS);
  await confirmNewWorkspace(peerA.page);

  await openShareWorkspacePanel(peerA.page);
  const attrs = await readShareWorkspaceAttrs(peerA.page);
  expect(attrs.coId).toMatch(/^co_/);
  expect(attrs.syncUrl).toBe(harness!.sync.url);
  await confirmShareWorkspace(peerA.page);

  await openJoinWorkspacePanel(peerB.page);
  await fillJoinWorkspaceForm(peerB.page, {
    coId: attrs.coId,
    syncUrl: attrs.syncUrl,
    name: `joined-${SHARED_WS}`,
  });
  await confirmJoinWorkspace(peerB.page);

  await switchToMateriaisTab(peerA);
  await switchToMateriaisTab(peerB);
}, 180_000);

afterAll(async () => {
  if (harness) await harness.teardown();
});

describe("Materials catalog — collaborative sync (shortcut variant)", () => {
  it("peer B authors a type via `e`; peer A creates a material via `q`", async () => {
    await addMaterialTypeViaShortcut(peerB.page, {
      name: TYPE_NAME,
      version: "0.0.1",
      principal: "nome",
      extra: "peso",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
      ],
    });

    await waitForCatalogIPC(
      peerA,
      `(snap) => Object.values(snap.materialTypes).some(t => t.id === "${TYPE_NAME}@0.0.1")`,
    );
    await rehydrateMaterials(peerA);

    await addMaterialViaShortcut(peerA.page, {
      id: MAT_A,
      type: TYPE_NAME,
      stockAmount: 10,
      attributes: { nome: "Material A", peso: 42 },
    });

    await waitForCatalogIPC(
      peerB,
      `(snap) => {
        const m = snap.materials["${MAT_A}"];
        return Boolean(m) && m.schemaVersion === "0.0.1";
      }`,
    );
  }, 180_000);

  it("peer A bumps the type via `r`; peer B adds a material on 0.0.2 via `q`", async () => {
    await updateMaterialTypeViaShortcut(peerA.page, {
      typeName: TYPE_NAME,
      version: "0.0.2",
      attributes: [
        { name: "nome", kind: "string" },
        { name: "peso", kind: "number" },
        { name: "cor", kind: "color" },
      ],
    });

    await waitForCatalogIPC(
      peerB,
      `(snap) => Object.values(snap.materialTypes).some(t => t.id === "${TYPE_NAME}@0.0.2")`,
    );
    await rehydrateMaterials(peerB);

    await addMaterialViaShortcut(peerB.page, {
      id: MAT_B,
      type: TYPE_NAME,
      stockAmount: 7,
      attributes: { nome: "Material B", peso: 11 },
    });

    await waitForCatalogIPC(
      peerA,
      `(snap) => {
        const m = snap.materials["${MAT_B}"];
        return Boolean(m) && m.schemaVersion === "0.0.2";
      }`,
    );
  }, 180_000);
});
