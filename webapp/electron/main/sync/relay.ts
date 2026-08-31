/**
 * The sync relay: a WebSocket hub that forwards changes within a workspace.
 *
 * It stores nothing and understands one message (`hello`). Everything else is
 * forwarded verbatim to the other members of the room. That is the whole
 * design: peers hold the state and do the merging, so the server can be
 * restarted, replaced, or run by anyone who can be trusted with the data —
 * which, per `protocol.ts`, it must be.
 *
 * Deliberately not a store-and-forward server. A peer that is offline when a
 * change is broadcast catches up by asking (`want`) the next time it connects,
 * and any peer still holding the change answers — cr-sqlite re-stamps applied
 * changes with the local clock while preserving their origin, so a third peer
 * can relay a change it did not author. Adding storage here would mean the
 * relay holding plaintext at rest as well as in flight.
 */
import { WebSocketServer, type WebSocket } from "ws";

import { parseMessage, SYNC_PROTOCOL, type HelloMessage } from "./protocol";

interface Member {
  socket: WebSocket;
  site: string;
}

export interface RelayOptions {
  port: number;
  host?: string;
  /**
   * Shared secret a peer must present in `hello`. When set, a peer that does
   * not present it is closed rather than ignored, so a misconfigured client
   * fails loudly instead of silently never syncing.
   */
  token?: string;
  onLog?: (message: string) => void;
}

export interface RunningRelay {
  port: number;
  close: () => Promise<void>;
}

export function startRelay(options: RelayOptions): Promise<RunningRelay> {
  const log = options.onLog ?? ((m: string) => console.log(`[sync-relay] ${m}`));
  const rooms = new Map<string, Set<Member>>();

  const server = new WebSocketServer({
    port: options.port,
    host: options.host ?? "127.0.0.1",
  });

  server.on("connection", (socket) => {
    let member: Member | null = null;
    let room: string | null = null;

    socket.on("message", (data) => {
      const message = parseMessage(String(data));
      if (!message) return;

      if (message.t === "hello") {
        const hello = message as HelloMessage;
        if (options.token && hello.token !== options.token) {
          log(`rejected a peer for ${hello.workspace}: bad token`);
          socket.close(4401, "unauthorized");
          return;
        }
        if (hello.v !== SYNC_PROTOCOL) {
          log(`rejected a peer speaking protocol ${hello.v}`);
          socket.close(4400, `protocol ${SYNC_PROTOCOL} required`);
          return;
        }
        room = hello.workspace;
        member = { socket, site: hello.site };
        const members = rooms.get(room) ?? new Set<Member>();
        members.add(member);
        rooms.set(room, members);
        log(`peer ${hello.site.slice(0, 8)} joined ${room} (${members.size} in room)`);
        // Tell the room. Peers answer catch-up requests, and a peer that was
        // already connected has no other way to learn there is now someone
        // who may be behind it — or ahead of it.
        const joined = JSON.stringify({ t: "joined", site: hello.site });
        for (const other of members) {
          if (other === member) continue;
          if (other.socket.readyState !== other.socket.OPEN) continue;
          other.socket.send(joined);
        }
        return;
      }

      // Everything else is opaque: forward to the rest of the room. A peer
      // that has not said hello is not in a room and is therefore ignored,
      // which is what stops an unauthenticated socket from injecting changes.
      if (!room || !member) return;
      const members = rooms.get(room);
      if (!members) return;
      const payload = String(data);
      for (const other of members) {
        if (other === member) continue;
        if (other.socket.readyState !== other.socket.OPEN) continue;
        other.socket.send(payload);
      }
    });

    const drop = () => {
      if (!room || !member) return;
      const members = rooms.get(room);
      members?.delete(member);
      if (members && members.size === 0) rooms.delete(room);
      log(`peer ${member.site.slice(0, 8)} left ${room}`);
      member = null;
    };
    socket.on("close", drop);
    socket.on("error", drop);
  });

  return new Promise((resolve, reject) => {
    server.on("error", reject);
    server.on("listening", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : options.port;
      log(`listening on ${options.host ?? "127.0.0.1"}:${port}`);
      resolve({
        port,
        close: () =>
          new Promise<void>((done) => {
            for (const members of rooms.values()) {
              for (const m of members) m.socket.terminate();
            }
            rooms.clear();
            server.close(() => done());
          }),
      });
    });
  });
}
