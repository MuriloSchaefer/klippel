import { co, z, Group } from "jazz-tools";

export const WorkspaceMetadata = co.map({
  name: z.string(),
  createdAt: z.number(),
  ownerAccountId: z.string(),
  syncOptIn: z.boolean(),
  disallowRelay: z.boolean(),
});

/**
 * EditLease — single-writer coordination for `ModelCoMap.graphJson`.
 *
 * Atomic-string fields are last-writer-wins, so two peers editing the same
 * model would silently lose one set of changes. The lease gates writes to
 * `graphJson`: only the current holder may mutate it. Enforcement lives in
 * the main-process middleware and (Phase 6) the receive-validator.
 *
 * TTL is 60s by default; the editor renews on focus and releases on close.
 */
export const EditLease = co.map({
  holderAccountId: z.string(),
  acquiredAt: z.number(),
  expiresAt: z.number(),
});

/**
 * ModelCoMap — one model.
 *
 * `graphJson` is stored as an atomic string per the plan's perf guidance
 * (graphs are loaded/saved as a whole; per-node CRDTs would bloat history).
 * Concurrent-write hazard is mitigated by `editLease`.
 *
 * `svg` is a BinaryCoStream so blob sync is native to Jazz; the renderer
 * fetches and sanitizes the bytes before mounting.
 */
export const ModelCoMap = co.map({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  graphJson: z.string(),
  svg: co.optional(co.fileStream()),
  editLease: co.optional(EditLease),
  updatedAt: z.number(),
});

export const ModelsMap = co.record(z.string(), ModelCoMap);

export const WorkspaceCoMap = co.map({
  metadata: WorkspaceMetadata,
  models: ModelsMap,
});

export const KlippelRoot = co.map({
  workspaces: co.list(WorkspaceCoMap),
});

export const KlippelAccountProfile = co.profile({
  name: z.string(),
});

export const KlippelAccount = co
  .account({
    profile: KlippelAccountProfile,
    root: KlippelRoot,
  })
  .withMigration(async (account) => {
    if (!account.$jazz.has("profile")) {
      const group = Group.create();
      group.addMember("everyone", "reader");
      account.$jazz.set(
        "profile",
        KlippelAccountProfile.create({ name: "Klippel User" }, group),
      );
    }
    if (!account.$jazz.has("root")) {
      const group = Group.create();
      account.$jazz.set(
        "root",
        KlippelRoot.create(
          { workspaces: co.list(WorkspaceCoMap).create([], group) },
          group,
        ),
      );
    }
  });
