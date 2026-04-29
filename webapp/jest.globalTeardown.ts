export default async function globalTeardown() {
  if (!(globalThis as any).__KLIPPEL_OWNED_PROCESS__) return;
  const pid = (globalThis as any).__KLIPPEL_DEV_PID__ as number | undefined;
  if (!pid) return;
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}
