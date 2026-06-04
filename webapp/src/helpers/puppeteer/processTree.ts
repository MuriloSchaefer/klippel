/* istanbul ignore file */
/**
 * Process-tree utilities for the headless e2e harness.
 *
 * The teardown leak (see analysis/e2e-headless-memory-leak.md) has two causes
 * a naive `child.kill()` can't handle:
 *   - the system `xvfb-run` has **no signal trap**: signalling the wrapper
 *     kills the bash shell but abandons its Xvfb + Electron children (and
 *     never runs its own `kill $XVFBPID`), so they survive, re-parented to the
 *     session reaper (`systemd --user`, not pid 1);
 *   - Chromium GPU/zygote helpers can `setsid` out of the process group.
 *
 * {@link killProcessTree} defeats both by capturing the descendant PIDs
 * *up-front* (re-parented children keep their PID, so they stay reachable),
 * then escalating SIGTERM → SIGKILL across the whole captured set plus the
 * process group. Linux-only (reads `/proc`); the harness already requires
 * Linux+Xvfb in headless mode.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

export const procAlive = (pid: number): boolean => existsSync(`/proc/${pid}`);

const readStat = (pid: number): { ppid: number; comm: string } | null => {
  try {
    // /proc/<pid>/stat: "pid (comm) state ppid ...". comm can contain spaces
    // and ')', so parse after the last ')'.
    const stat = readFileSync(`/proc/${pid}/stat`, "utf8");
    const close = stat.lastIndexOf(")");
    const comm = stat.slice(stat.indexOf("(") + 1, close);
    const rest = stat.slice(close + 2).split(" ");
    return { ppid: Number(rest[1]), comm }; // rest[0]=state, rest[1]=ppid
  } catch {
    return null;
  }
};

export const ppidOf = (pid: number): number => readStat(pid)?.ppid ?? -1;
export const commOf = (pid: number): string => readStat(pid)?.comm ?? "?";

/** All transitive descendants of `root` (excluding `root` itself). */
export const descendantsOf = (root: number): number[] => {
  const children = new Map<number, number[]>();
  try {
    for (const name of readdirSync("/proc")) {
      if (!/^\d+$/.test(name)) continue;
      const st = readStat(Number(name));
      if (!st) continue;
      const arr = children.get(st.ppid) ?? [];
      arr.push(Number(name));
      children.set(st.ppid, arr);
    }
  } catch {
    return [];
  }
  const out: number[] = [];
  const stack = [root];
  while (stack.length) {
    const p = stack.pop() as number;
    for (const c of children.get(p) ?? []) {
      out.push(c);
      stack.push(c);
    }
  }
  return out;
};

/**
 * Reliably tear down a spawned process tree.
 *
 * 1. snapshot `root` + all descendants (before anything dies, so PIDs are still
 *    discoverable);
 * 2. SIGTERM the process group (no-op if `root` isn't a group leader) and every
 *    captured PID — a graceful chance to exit;
 * 3. after `graceMs`, SIGKILL the group and any captured PID still alive — this
 *    is what actually reaps the Xvfb/Electron the trap-less wrapper abandoned.
 *
 * Sending to individual PIDs (not just the group) is essential: the leaked
 * children re-parent away from the group, so a group-only kill misses them.
 */
export const killProcessTree = async (
  root: number | undefined,
  { graceMs = 2000 }: { graceMs?: number } = {},
): Promise<void> => {
  if (typeof root !== "number") return;
  const watched = [root, ...descendantsOf(root)];

  const signalGroup = (sig: NodeJS.Signals) => {
    try {
      process.kill(-root, sig); // negative pid = process group
    } catch {
      /* root isn't a group leader, or group already gone */
    }
  };
  const signalEach = (sig: NodeJS.Signals) => {
    for (const pid of watched) {
      if (!procAlive(pid)) continue;
      try {
        process.kill(pid, sig);
      } catch {
        /* already gone */
      }
    }
  };

  signalGroup("SIGTERM");
  signalEach("SIGTERM");

  const deadline = Date.now() + graceMs;
  while (Date.now() < deadline) {
    if (!watched.some(procAlive)) return;
    await sleep(100);
  }

  signalGroup("SIGKILL");
  signalEach("SIGKILL");
};
