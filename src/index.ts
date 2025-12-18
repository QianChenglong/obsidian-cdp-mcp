#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { CDPClient } from "./cdp-client.js";
import { toolDefinitions, ToolHandler } from "./tools.js";

const DEBUG_PORT = parseInt(process.env.OBSIDIAN_DEBUG_PORT || "9222", 10);

async function main() {
  const cdp = new CDPClient(DEBUG_PORT);
  const toolHandler = new ToolHandler(cdp);

  const server = new Server(
    {
      name: "obsidian-cdp-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      // Ensure connection before handling tool
      await cdp.connect();
      return await toolHandler.handle(name, args || {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Cleanup on exit
  process.on("SIGINT", () => {
    cdp.disconnect();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cdp.disconnect();
    process.exit(0);
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(`Obsidian CDP MCP Server started (debug port: ${DEBUG_PORT})`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
