import { useEffect, useRef, useState, useCallback } from "react";
import type { EditLeaseSnapshot } from "../typings";

const jazz = globalThis.electron.jazz;

const RENEW_INTERVAL_MS = 30_000;
const POLL_INTERVAL_MS = 15_000;
const IDLE_RELEASE_MS = 90_000;

export type LeaseStatus =
  | { kind: "free" }
  | { kind: "held"; snapshot: EditLeaseSnapshot }
  | { kind: "held_by_other"; snapshot: EditLeaseSnapshot }
  | { kind: "unavailable"; reason: string };

type Identity = string | null;

/**
 * Manage the edit lease for a model: acquire on mount, renew on window focus
 * and on a periodic timer, release on unmount or idle. Polls the current
 * lease state so the UI can flip to read-only when another peer is editing.
 *
 * Best-effort — the main-process check on `updateModelGraph` is authoritative.
 * If acquire fails because another peer holds the lease, status reflects that
 * and the editor should treat the model as read-only.
 */
export default function useEditLease(modelId: string | undefined): LeaseStatus {
  const [status, setStatus] = useState<LeaseStatus>({ kind: "free" });
  const accountIdRef = useRef<Identity>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const heldRef = useRef<boolean>(false);

  const refresh = useCallback(async (): Promise<EditLeaseSnapshot | undefined> => {
    if (!modelId) return undefined;
    try {
      const loaded = await jazz.loadModel(modelId);
      const lease = loaded?.editLease;
      const me = accountIdRef.current;
      if (!lease || lease.expiresAt < Date.now()) {
        setStatus({ kind: "free" });
        heldRef.current = false;
        return undefined;
      }
      if (me && lease.holderAccountId === me) {
        setStatus({ kind: "held", snapshot: lease });
        heldRef.current = true;
      } else {
        setStatus({ kind: "held_by_other", snapshot: lease });
        heldRef.current = false;
      }
      return lease;
    } catch (err) {
      setStatus({ kind: "unavailable", reason: err instanceof Error ? err.message : String(err) });
      heldRef.current = false;
      return undefined;
    }
  }, [modelId]);

  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;

    (async () => {
      try {
        accountIdRef.current = await jazz.getAccountId();
      } catch {
        accountIdRef.current = null;
      }
      if (cancelled) return;
      try {
        const snapshot = await jazz.acquireLease(modelId);
        if (cancelled) return;
        setStatus({ kind: "held", snapshot });
        heldRef.current = true;
      } catch (err) {
        // Acquire failed — likely held by another peer. Reflect that and keep polling.
        if (!cancelled) {
          await refresh();
        }
      }
    })();

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener("mousemove", markActivity, { passive: true });
    window.addEventListener("keydown", markActivity);
    window.addEventListener("pointerdown", markActivity);

    const onFocus = async () => {
      lastActivityRef.current = Date.now();
      if (!heldRef.current) {
        try {
          const snapshot = await jazz.acquireLease(modelId);
          setStatus({ kind: "held", snapshot });
          heldRef.current = true;
          return;
        } catch {
          await refresh();
          return;
        }
      }
      try {
        const snapshot = await jazz.renewLease(modelId);
        setStatus({ kind: "held", snapshot });
      } catch {
        await refresh();
      }
    };
    window.addEventListener("focus", onFocus);

    const renewTimer = setInterval(async () => {
      if (cancelled) return;
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor > IDLE_RELEASE_MS) {
        if (heldRef.current) {
          try {
            await jazz.releaseLease(modelId);
          } catch {
            /* best-effort */
          }
          heldRef.current = false;
          await refresh();
        }
        return;
      }
      if (heldRef.current) {
        try {
          const snapshot = await jazz.renewLease(modelId);
          setStatus({ kind: "held", snapshot });
        } catch {
          heldRef.current = false;
          await refresh();
        }
      }
    }, RENEW_INTERVAL_MS);

    const pollTimer = setInterval(() => {
      if (!cancelled && !heldRef.current) {
        void refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("mousemove", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("pointerdown", markActivity);
      clearInterval(renewTimer);
      clearInterval(pollTimer);
      if (heldRef.current) {
        // Best-effort release — IPC is async but we cannot await in cleanup.
        void jazz.releaseLease(modelId).catch(() => {});
        heldRef.current = false;
      }
    };
  }, [modelId, refresh]);

  return status;
}
