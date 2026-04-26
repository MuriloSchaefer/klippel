// Standalone MCP server entry point.
// Run with the Electron app already open (remote-debugging-port=9222):
//   npx tsx electron/main/mcp/server.ts
// Or point to a different CDP port:
//   CDP_PORT=9223 npx tsx electron/main/mcp/server.ts
import { startMcpServer } from './index';

startMcpServer().catch((err) => {
  console.error('[MCP] failed to start:', err);
  process.exit(1);
});
