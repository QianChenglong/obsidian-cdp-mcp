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
  {
    name: "obsidian_get_backlinks",
    description: "Get all backlinks (incoming links) for a file. Returns files that link to the specified file.",
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
    name: "obsidian_get_outlinks",
    description: "Get all outgoing links from a file. Returns files that the specified file links to.",
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
    name: "obsidian_get_tags",
    description: "Get all tags in the vault with their usage count, or get tags for a specific file.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Optional: Path to a specific file to get tags from. If not provided, returns all tags in vault.",
        },
      },
    },
  },
  {
    name: "obsidian_get_frontmatter",
    description: "Get the frontmatter (YAML metadata) of a file.",
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
    name: "obsidian_update_frontmatter",
    description: "Update frontmatter properties of a file. Can add, modify, or delete properties.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root",
        },
        properties: {
          type: "object",
          description: "Properties to update. Set value to null to delete a property.",
        },
      },
      required: ["path", "properties"],
    },
  },
  {
    name: "obsidian_dataview_query",
    description: "Execute a Dataview query (DQL) and return results. Requires Dataview plugin to be installed.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Dataview query (DQL). Examples: 'LIST FROM #tag', 'TABLE file.ctime FROM \"folder\"'",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "obsidian_list_folder",
    description: "List contents of a folder in the vault.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the folder relative to vault root. Use empty string or '/' for root.",
        },
        recursive: {
          type: "boolean",
          description: "Include subfolders recursively (default: false)",
        },
      },
    },
  },
  {
    name: "obsidian_create_folder",
    description: "Create a new folder in the vault.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path for the new folder relative to vault root",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "obsidian_move_file",
    description: "Move or rename a file/folder in the vault.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Current path of the file/folder",
        },
        to: {
          type: "string",
          description: "New path for the file/folder",
        },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "obsidian_delete_file",
    description: "Delete a file or folder (moves to system trash by default).",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file/folder to delete",
        },
        permanent: {
          type: "boolean",
          description: "Permanently delete instead of moving to trash (default: false)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "obsidian_get_recent_files",
    description: "Get list of recently opened files.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of files to return (default: 10)",
        },
      },
    },
  },
  {
    name: "obsidian_get_selection",
    description: "Get the currently selected text in the active editor.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "obsidian_replace_selection",
    description: "Replace the currently selected text in the active editor.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to replace the selection with",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "obsidian_insert_at_cursor",
    description: "Insert text at the current cursor position in the active editor.",
    inputSchema: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text to insert at cursor position",
        },
      },
      required: ["text"],
    },
  },
  {
    name: "obsidian_get_cursor_position",
    description: "Get the current cursor position in the active editor.",
    inputSchema: {
      type: "object",
      properties: {},
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

      case "obsidian_get_backlinks": {
        const path = args.path as string;
        const result = await this.cdp.evaluate(`
          (() => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            const backlinks = app.metadataCache.getBacklinksForFile(file);
            if (!backlinks) return { path: "${path}", backlinks: [] };
            const data = backlinks.data;
            return {
              path: "${path}",
              backlinks: Object.entries(data).map(([filePath, links]) => ({
                file: filePath,
                count: links.length,
                positions: links.slice(0, 5).map(l => ({ line: l.position?.start?.line, col: l.position?.start?.col }))
              }))
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_outlinks": {
        const path = args.path as string;
        const result = await this.cdp.evaluate(`
          (() => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            const cache = app.metadataCache.getFileCache(file);
            if (!cache) return { path: "${path}", outlinks: [] };
            const links = cache.links || [];
            const embeds = cache.embeds || [];
            return {
              path: "${path}",
              outlinks: links.map(l => ({
                link: l.link,
                displayText: l.displayText,
                resolved: !!app.metadataCache.getFirstLinkpathDest(l.link, "${path}")
              })),
              embeds: embeds.map(e => ({
                link: e.link,
                resolved: !!app.metadataCache.getFirstLinkpathDest(e.link, "${path}")
              }))
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_tags": {
        const path = args.path as string | undefined;
        const escapedPath = path ? path.replace(/"/g, '\\"') : "";
        const result = await this.cdp.evaluate(`
          (() => {
            const path = "${escapedPath}";
            if (path) {
              const file = app.vault.getAbstractFileByPath(path);
              if (!file) return { error: "File not found: " + path };
              const cache = app.metadataCache.getFileCache(file);
              if (!cache) return { path, tags: [] };
              const tags = cache.tags?.map(t => t.tag) || [];
              const frontmatterTags = cache.frontmatter?.tags || [];
              return {
                path,
                tags: [...new Set([...tags, ...(Array.isArray(frontmatterTags) ? frontmatterTags : [frontmatterTags])])]
              };
            } else {
              const allTags = app.metadataCache.getTags();
              return {
                tags: Object.entries(allTags)
                  .map(([tag, count]) => ({ tag, count }))
                  .sort((a, b) => b.count - a.count)
              };
            }
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_frontmatter": {
        const path = args.path as string;
        const result = await this.cdp.evaluate(`
          (() => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            const cache = app.metadataCache.getFileCache(file);
            return {
              path: "${path}",
              frontmatter: cache?.frontmatter || null,
              position: cache?.frontmatterPosition || null
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_update_frontmatter": {
        const path = args.path as string;
        const properties = args.properties as Record<string, unknown>;
        const escapedProperties = JSON.stringify(properties);
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            const properties = ${escapedProperties};
            await app.fileManager.processFrontMatter(file, (fm) => {
              for (const [key, value] of Object.entries(properties)) {
                if (value === null) {
                  delete fm[key];
                } else {
                  fm[key] = value;
                }
              }
            });
            return { success: true, path: "${path}", updated: Object.keys(properties) };
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_dataview_query": {
        const query = args.query as string;
        const escapedQuery = JSON.stringify(query);
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const dv = app.plugins.plugins['dataview'];
            if (!dv) return { error: "Dataview plugin is not installed." };
            if (!dv.api) return { error: "Dataview API is not available. Make sure the plugin is enabled." };
            
            try {
              const result = await dv.api.query(${escapedQuery});
              if (!result.successful) {
                return { error: result.error };
              }
              
              const value = result.value;
              if (value.type === 'list') {
                return {
                  type: 'list',
                  values: value.values.slice(0, 100).map(v => {
                    if (v?.path) return { type: 'file', path: v.path };
                    return v;
                  })
                };
              } else if (value.type === 'table') {
                return {
                  type: 'table',
                  headers: value.headers,
                  values: value.values.slice(0, 100).map(row => 
                    row.map(cell => {
                      if (cell?.path) return { type: 'file', path: cell.path };
                      if (cell?.ts) return cell.toString();
                      return cell;
                    })
                  )
                };
              } else if (value.type === 'task') {
                return {
                  type: 'task',
                  values: value.values.slice(0, 100).map(t => ({
                    text: t.text,
                    completed: t.completed,
                    path: t.path,
                    line: t.line
                  }))
                };
              }
              return value;
            } catch (e) {
              return { error: e.message };
            }
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_list_folder": {
        const path = (args.path as string) || "";
        const recursive = args.recursive as boolean;
        const result = await this.cdp.evaluate(`
          (() => {
            const path = "${path.replace(/"/g, '\\"')}".replace(/^\\/+/, '');
            const folder = path ? app.vault.getAbstractFileByPath(path) : app.vault.getRoot();
            if (!folder) return { error: "Folder not found: ${path}" };
            if (!folder.children) return { error: "Not a folder: ${path}" };
            
            const listFolder = (f, recurse) => {
              return f.children.map(child => {
                const item = {
                  name: child.name,
                  path: child.path,
                  type: child.children ? 'folder' : 'file'
                };
                if (child.children && recurse) {
                  item.children = listFolder(child, true);
                }
                if (!child.children) {
                  item.extension = child.extension;
                  item.size = child.stat?.size;
                }
                return item;
              });
            };
            
            return {
              path: path || '/',
              contents: listFolder(folder, ${recursive})
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_create_folder": {
        const path = args.path as string;
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const path = "${path.replace(/"/g, '\\"')}";
            const existing = app.vault.getAbstractFileByPath(path);
            if (existing) return { error: "Path already exists: ${path}" };
            await app.vault.createFolder(path);
            return { success: true, path };
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_move_file": {
        const from = args.from as string;
        const to = args.to as string;
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${from.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${from}" };
            await app.fileManager.renameFile(file, "${to.replace(/"/g, '\\"')}");
            return { success: true, from: "${from}", to: "${to}" };
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_delete_file": {
        const path = args.path as string;
        const permanent = args.permanent as boolean;
        const result = await this.cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${path.replace(/"/g, '\\"')}");
            if (!file) return { error: "File not found: ${path}" };
            if (${permanent}) {
              await app.vault.delete(file);
            } else {
              await app.vault.trash(file, false);
            }
            return { success: true, path: "${path}", permanent: ${permanent} };
          })()
        `,
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_recent_files": {
        const limit = (args.limit as number) || 10;
        const result = await this.cdp.evaluate(`
          (() => {
            const recentFiles = app.workspace.getRecentFiles();
            return recentFiles.slice(0, ${limit}).map(path => {
              const file = app.vault.getAbstractFileByPath(path);
              return {
                path,
                exists: !!file,
                size: file?.stat?.size,
                mtime: file?.stat?.mtime
              };
            });
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_selection": {
        const result = await this.cdp.evaluate(`
          (() => {
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const selection = editor.getSelection();
            const from = editor.getCursor('from');
            const to = editor.getCursor('to');
            return {
              text: selection,
              from: { line: from.line, ch: from.ch },
              to: { line: to.line, ch: to.ch },
              isEmpty: selection === ''
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_replace_selection": {
        const text = args.text as string;
        const escapedText = JSON.stringify(text);
        const result = await this.cdp.evaluate(`
          (() => {
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const oldSelection = editor.getSelection();
            editor.replaceSelection(${escapedText});
            return {
              success: true,
              replaced: oldSelection,
              with: ${escapedText}
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_insert_at_cursor": {
        const text = args.text as string;
        const escapedText = JSON.stringify(text);
        const result = await this.cdp.evaluate(`
          (() => {
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const cursor = editor.getCursor();
            editor.replaceRange(${escapedText}, cursor);
            return {
              success: true,
              inserted: ${escapedText},
              at: { line: cursor.line, ch: cursor.ch }
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      case "obsidian_get_cursor_position": {
        const result = await this.cdp.evaluate(`
          (() => {
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const cursor = editor.getCursor();
            const line = editor.getLine(cursor.line);
            return {
              line: cursor.line,
              ch: cursor.ch,
              lineContent: line,
              totalLines: editor.lineCount()
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
