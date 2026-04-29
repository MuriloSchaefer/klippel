---
description: Reconnect to the klippel MCP server and reload tool schemas after editing mcpTools/* or electron/main/mcp/index.ts.
---

The user just changed an MCP tool definition. Do the following in order:

1. Run `/mcp` to surface the current MCP server status. If `klippel` is not in `connected` state, request a reconnect for it.
2. Use `ToolSearch` with `query: "+klippel"` and `max_results: 30` to refresh the cached tool schemas for the klippel server.
3. Report back: which klippel tools are now visible, and whether any expected new tool is still missing (in which case the user needs to restart the MCP host process).

Do not attempt to rebuild or restart the MCP host process yourself — Claude Code respawns it from `.claude/settings.json` automatically when reconnecting. Only the Claude-side schema cache needs refreshing, which is what this command does.
