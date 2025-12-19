import { CDPClient } from "./cdp-client.js";

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "obsidian_screenshot",
    description:
      "Take a screenshot of the current Obsidian window. Returns base64-encoded image data.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["png", "jpeg"],
          description: "Image format (default: png)",
        },
        quality: {
          type: "number",
          description: "JPEG quality 0-100 (only for jpeg format)",
        },
      },
    },
  },
  {
    name: "obsidian_console",
    description:
      "Get console output from Obsidian. Useful for debugging plugins and monitoring activity.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of messages to return (default: 50)",
        },
        type: {
          type: "string",
          enum: ["all", "log", "warn", "error", "info", "debug"],
          description: "Filter by message type (default: all)",
        },
        clear: {
          type: "boolean",
          description: "Clear console messages after retrieving (default: false)",
        },
      },
    },
  },
  {
    name: "obsidian_eval",
    description:
      "Execute JavaScript code in Obsidian. Has access to `app` object for full Obsidian API access.",
    inputSchema: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "JavaScript code to execute. Use `app` to access Obsidian API.",
        },
        await_promise: {
          type: "boolean",
          description: "Wait for promise to resolve if code returns a promise (default: true)",
        },
      },
      required: ["code"],
    },
  },
  {
    name: "obsidian_get_active_file",
    description: "Get information about the currently active file in Obsidian.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "obsidian_read_file",
    description: "Read the content of a file from the Obsidian vault.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "obsidian_write_file",
    description: "Write or update content to a file in the Obsidian vault.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root",
        },
        content: {
          type: "string",
          description: "Content to write to the file",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "obsidian_search",
    description: "Search for files in the Obsidian vault by file path.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (matches file path)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 20)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "obsidian_omnisearch",
    description: "Full-text search in Obsidian vault using Omnisearch plugin. Returns ranked results with excerpts and match positions. Requires Omnisearch plugin to be installed and enabled.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query (supports full-text search with fuzzy matching)",
        },
        limit: {
          type: "number",
          description: "Maximum number of results (default: 10)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "obsidian_list_plugins",
    description: "List all installed plugins and their status.",
    inputSchema: {
      type: "object",
      properties: {
        enabled_only: {
          type: "boolean",
          description: "Only show enabled plugins (default: false)",
        },
      },
    },
  },
  {
    name: "obsidian_execute_command",
    description: "Execute an Obsidian command by its ID.",
    inputSchema: {
      type: "object",
      properties: {
        command_id: {
          type: "string",
          description: "Command ID to execute (e.g., 'editor:toggle-fold')",
        },
      },
      required: ["command_id"],
    },
  },
  {
    name: "obsidian_list_commands",
    description: "List all available Obsidian commands.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          description: "Filter commands by name or ID",
        },
      },
    },
  },
  {
    name: "obsidian_get_vault_info",
    description: "Get information about the current Obsidian vault.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "obsidian_open_file",
    description: "Open a file in Obsidian.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file to open",
        },
        new_leaf: {
          type: "boolean",
          description: "Open in a new pane (default: false)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "obsidian_dom_query",
    description: "Query DOM elements in Obsidian UI. Useful for inspecting UI state.",
    inputSchema: {
      type: "object",
      properties: {
        selector: {
          type: "string",
          description: "CSS selector to query",
        },
        attribute: {
          type: "string",
          description: "Attribute to extract (default: innerHTML, use 'text' for textContent)",
        },
        all: {
          type: "boolean",
          description: "Return all matching elements (default: false, returns first match)",
        },
      },
      required: ["selector"],
    },
  },
];

export class ToolHandler {
  constructor(private cdp: CDPClient) {}

  async handle(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
    switch (name) {
      case "obsidian_screenshot": {
        const format = (args.format as "png" | "jpeg") || "png";
        const quality = args.quality as number | undefined;
        const data = await this.cdp.screenshot(format, quality);
        return {
          content: [
            {
              type: "image",
              data,
              mimeType: `image/${format}`,
            },
          ],
        };
      }

      case "obsidian_console": {
        const limit = (args.limit as number) || 50;
        const type = (args.type as string) || "all";
        const clear = args.clear as boolean;

        let messages = this.cdp.getConsoleMessages();
        if (type !== "all") {
          messages = messages.filter((m) => m.type === type);
        }
        messages = messages.slice(-limit);

        if (clear) {
          this.cdp.clearConsoleMessages();
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(messages, null, 2),
            },
          ],
        };
      }

      case "obsidian_eval": {
        const code = args.code as string;
        const awaitPromise = args.await_promise !== false;
        const result = await this.cdp.evaluate(code, awaitPromise);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "obsidian_get_active_file": {
        const result = await this.cdp.evaluate(`
          (() => {
            const file = app.workspace.getActiveFile();
            if (!file) return null;
            return {
              path: file.path,
              name: file.name,
              basename: file.basename,
              extension: file.extension,
              stat: file.stat
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_read_file": {
        const path = args.path as string;
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            return await app.vault.read(file);
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }],
        };
      }

      case "obsidian_write_file": {
        const path = args.path as string;
        const content = args.content as string;
        const escapedContent = JSON.stringify(content);
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const path = "${path.replace(/"/g, '\\"')}";
            const content = ${escapedContent};
            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
              await app.vault.modify(file, content);
              return { success: true, action: "modified", path };
            } else {
              await app.vault.create(path, content);
              return { success: true, action: "created", path };
            }
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_search": {
        const query = args.query as string;
        const limit = (args.limit as number) || 20;
        const result = await this.cdp.evaluate(`
          app.vault.getFiles()
            .filter(f => f.path.toLowerCase().includes("${query.toLowerCase().replace(/"/g, '\\"')}"))
            .slice(0, ${limit})
            .map(f => ({ path: f.path, name: f.name, extension: f.extension }))
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_omnisearch": {
        const query = args.query as string;
        const limit = (args.limit as number) || 10;
        const escapedQuery = JSON.stringify(query);
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const omnisearch = app.plugins.plugins['omnisearch'];
            if (!omnisearch) {
              return { error: "Omnisearch plugin is not installed. Please install it from Obsidian community plugins." };
            }
            if (!omnisearch.api) {
              return { error: "Omnisearch API is not available. Please make sure Omnisearch plugin is enabled." };
            }
            const results = await omnisearch.api.search(${escapedQuery});
            return results.slice(0, ${limit}).map(r => ({
              score: r.score,
              path: r.path,
              basename: r.basename,
              foundWords: r.foundWords,
              matches: r.matches?.slice(0, 10),
              excerpt: r.excerpt
            }));
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_list_plugins": {
        const enabledOnly = args.enabled_only as boolean;
        const result = await this.cdp.evaluate(`
          Object.entries(app.plugins.plugins)
            .filter(([id]) => ${enabledOnly} ? app.plugins.enabledPlugins.has(id) : true)
            .map(([id, p]) => ({
              id,
              name: p.manifest.name,
              version: p.manifest.version,
              enabled: app.plugins.enabledPlugins.has(id),
              description: p.manifest.description
            }))
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_execute_command": {
        const commandId = args.command_id as string;
        const result = await this.cdp.evaluate(`
          (() => {
            const cmd = app.commands.commands["${commandId.replace(/"/g, '\\"')}"];
            if (!cmd) return { error: "Command not found: ${commandId}" };
            app.commands.executeCommandById("${commandId.replace(/"/g, '\\"')}");
            return { success: true, command: cmd.name };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_list_commands": {
        const filter = (args.filter as string) || "";
        const result = await this.cdp.evaluate(`
          Object.entries(app.commands.commands)
            .filter(([id, cmd]) => {
              const f = "${filter.toLowerCase().replace(/"/g, '\\"')}";
              return !f || id.toLowerCase().includes(f) || cmd.name.toLowerCase().includes(f);
            })
            .map(([id, cmd]) => ({ id, name: cmd.name }))
            .slice(0, 100)
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_vault_info": {
        const result = await this.cdp.evaluate(`
          ({
            name: app.vault.getName(),
            fileCount: app.vault.getFiles().length,
            folderCount: app.vault.getAllLoadedFiles().filter(f => f.children).length,
            configDir: app.vault.configDir,
            adapter: app.vault.adapter.basePath
          })
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_open_file": {
        const path = args.path as string;
        const newLeaf = args.new_leaf as boolean;
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            await app.workspace.openLinkText("${path.replace(/"/g, '\\"')}", "", ${newLeaf});
            return { success: true, path: "${path}" };
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_dom_query": {
        const selector = args.selector as string;
        const attribute = (args.attribute as string) || "innerHTML";
        const all = args.all as boolean;

        const result = await this.cdp.evaluate(`
          (() => {
            const attr = "${attribute}";
            const getValue = (el) => {
              if (attr === "text") return el.textContent;
              if (attr === "innerHTML") return el.innerHTML.substring(0, 2000);
              return el.getAttribute(attr);
            };
            
            if (${all}) {
              return Array.from(document.querySelectorAll("${selector.replace(/"/g, '\\"')}"))
                .slice(0, 20)
                .map(getValue);
            } else {
              const el = document.querySelector("${selector.replace(/"/g, '\\"')}");
              return el ? getValue(el) : null;
            }
          })()
        `);
        return {
          content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
