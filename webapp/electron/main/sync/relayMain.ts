/**
 * Standalone entry point for the sync relay.
 *
 * Built as a second `main` bundle (`electron.vite.config.ts`) rather than run
 * through a TypeScript loader, so the thing tests and operators start is the
 * same code the app was built from, with no separate toolchain to keep in
 * step.
 *
 *   node dist/electron/main/sync-relay.js --port 4300 [--host 0.0.0.0]
 *
 * Port `0` asks the OS for a free one, and the chosen port is printed as
 * `listening <port>` on stdout — that line is the readiness signal a harness
 * waits for, so it is written before anything else can be logged.
 *
 * The token comes from `KLIPPEL_SYNC_TOKEN` rather than a flag: an argv is
 * visible to every process on the machine.
 */
import { startRelay } from "./relay";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<void> {
  const port = Number(flag("port") ?? process.env.KLIPPEL_SYNC_PORT ?? 0);
  const host = flag("host") ?? process.env.KLIPPEL_SYNC_HOST ?? "127.0.0.1";
  const token = process.env.KLIPPEL_SYNC_TOKEN;

  const relay = await startRelay({ port, host, token });
  // eslint-disable-next-line no-console
  console.log(`listening ${relay.port}`);

  const stop = () => {
    void relay.close().then(() => process.exit(0));
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

void main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[sync-relay] failed to start:", err);
  process.exit(1);
});
