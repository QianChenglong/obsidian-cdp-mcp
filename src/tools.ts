import { CDPClient } from "./cdp-client.js";
import { writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

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
      "Take a screenshot of the current Obsidian window. Saves to a temp file and returns the file path. Use webp format for best compression.",
    inputSchema: {
      type: "object",
      properties: {
        format: {
          type: "string",
          enum: ["png", "jpeg", "webp"],
          description: "Image format (default: webp for best compression)",
        },
        quality: {
          type: "number",
          description: "Image quality 0-100 for jpeg/webp (default: 80)",
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
    name: "obsidian_patch_file",
    description: "Apply partial edits to a file using search and replace. More efficient than write_file for small changes as it doesn't require sending the entire file content.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to the file relative to vault root",
        },
        patches: {
          type: "array",
          description: "Array of patch operations to apply in order",
          items: {
            type: "object",
            properties: {
              old_string: {
                type: "string",
                description: "The exact text to find and replace. Must match exactly including whitespace.",
              },
              new_string: {
                type: "string",
                description: "The text to replace with. Use empty string to delete.",
              },
            },
            required: ["old_string", "new_string"],
          },
        },
      },
      required: ["path", "patches"],
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
  // TODO: Dataview 接口暂时屏蔽
  // {
  //   name: "obsidian_dataview_query",
  //   description: "Execute a Dataview query (DQL) and return results. Requires Dataview plugin to be installed.",
  //   inputSchema: {
  //     type: "object",
  //     properties: {
  //       query: {
  //         type: "string",
  //         description: "Dataview query (DQL). Examples: 'LIST FROM #tag', 'TABLE file.ctime FROM \"folder\"'",
  //       },
  //     },
  //     required: ["query"],
  //   },
  // },
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
  {
    name: "obsidian_list_templates",
    description: "List all available templates in the templates folder.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "obsidian_apply_template",
    description: "Apply a template to the current file or create a new file from template.",
    inputSchema: {
      type: "object",
      properties: {
        template: {
          type: "string",
          description: "Template file name or path (relative to templates folder)",
        },
        target: {
          type: "string",
          description: "Target file path. If not provided, applies to current active file.",
        },
      },
      required: ["template"],
    },
  },
  {
    name: "obsidian_get_all_properties",
    description: "Get all property names used across the vault with their types and usage count.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "obsidian_resolve_link",
    description: "Resolve a wiki link to its actual file path.",
    inputSchema: {
      type: "object",
      properties: {
        link: {
          type: "string",
          description: "The wiki link to resolve (e.g., '[[Note Name]]' or 'Note Name')",
        },
        source: {
          type: "string",
          description: "Source file path for resolving relative links (optional)",
        },
      },
      required: ["link"],
    },
  },
  {
    name: "obsidian_search_community_plugins",
    description: "Search for plugins in the Obsidian community plugin repository.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query to find plugins by name or description",
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
    name: "obsidian_install_plugin",
    description: "Install a plugin from the Obsidian community plugin repository.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to install (e.g., 'dataview', 'templater-obsidian')",
        },
        enable: {
          type: "boolean",
          description: "Enable the plugin after installation (default: true)",
        },
      },
      required: ["plugin_id"],
    },
  },
  {
    name: "obsidian_enable_plugin",
    description: "Enable an installed plugin.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to enable",
        },
      },
      required: ["plugin_id"],
    },
  },
  {
    name: "obsidian_disable_plugin",
    description: "Disable an installed plugin.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to disable",
        },
      },
      required: ["plugin_id"],
    },
  },
  {
    name: "obsidian_uninstall_plugin",
    description: "Uninstall a plugin from Obsidian.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to uninstall",
        },
      },
      required: ["plugin_id"],
    },
  },
  {
    name: "obsidian_get_plugin_settings",
    description: "Get the settings/configuration of an installed plugin.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to get settings for",
        },
      },
      required: ["plugin_id"],
    },
  },
  {
    name: "obsidian_set_plugin_settings",
    description: "Update the settings/configuration of an installed plugin.",
    inputSchema: {
      type: "object",
      properties: {
        plugin_id: {
          type: "string",
          description: "The plugin ID to update settings for",
        },
        settings: {
          type: "object",
          description: "Settings object to merge with existing settings",
        },
      },
      required: ["plugin_id", "settings"],
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
        const format = (args.format as "png" | "jpeg" | "webp") || "webp";
        const quality = (args.quality as number) ?? (format === "png" ? undefined : 80);
        const data = await this.cdp.screenshot(format, quality);
        
        // Save to temp file
        const timestamp = Date.now();
        const filename = `obsidian-screenshot-${timestamp}.${format}`;
        const filepath = join(tmpdir(), filename);
        await writeFile(filepath, Buffer.from(data, "base64"));
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                path: filepath,
                format,
                quality,
              }),
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
              text: JSON.stringify(messages),
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
              text: JSON.stringify(result),
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
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_read_file": {
        const path = args.path as string;
        const result = await this.cdp.safeEvaluate(
          `
            const file = app.vault.getAbstractFileByPath(__args.path);
            if (!file) return { error: "File not found: " + __args.path };
            return await app.vault.read(file);
          `,
          { path },
          true
        );
        return {
          content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }],
        };
      }

      case "obsidian_write_file": {
        const path = args.path as string;
        const content = args.content as string;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, content } = __args;
            const file = app.vault.getAbstractFileByPath(path);
            if (file) {
              await app.vault.modify(file, content);
              return { success: true, action: "modified", path };
            } else {
              await app.vault.create(path, content);
              return { success: true, action: "created", path };
            }
          `,
          { path, content },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_patch_file": {
        const path = args.path as string;
        const patches = args.patches as Array<{ old_string: string; new_string: string }>;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, patches } = __args;
            
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) {
              return { error: "File not found: " + path };
            }
            
            const originalContent = await app.vault.read(file);
            
            // Phase 1: Validate all patches can be applied
            const failed = [];
            let validationContent = originalContent;
            for (let i = 0; i < patches.length; i++) {
              const patch = patches[i];
              const oldStr = patch.old_string;
              
              if (!validationContent.includes(oldStr)) {
                failed.push({ 
                  index: i, 
                  old_string: oldStr.substring(0, 50) + (oldStr.length > 50 ? '...' : ''), 
                  reason: "not found" 
                });
              } else {
                // Apply to validation content to handle sequential patches
                validationContent = validationContent.replace(oldStr, patch.new_string);
              }
            }
            
            // Strict mode: if any patch fails, abort entirely
            if (failed.length > 0) {
              return {
                success: false,
                path,
                applied: 0,
                failed: failed.length,
                details: { applied: [], failed },
                message: "Aborted: all patches must match. No changes were made."
              };
            }
            
            // Phase 2: All patches validated, apply them
            let content = originalContent;
            const applied = [];
            for (let i = 0; i < patches.length; i++) {
              const patch = patches[i];
              content = content.replace(patch.old_string, patch.new_string);
              applied.push({ 
                index: i, 
                old_string: patch.old_string.substring(0, 50) + (patch.old_string.length > 50 ? '...' : '') 
              });
            }
            
            await app.vault.modify(file, content);
            
            return {
              success: true,
              path,
              applied: applied.length,
              failed: 0,
              details: { applied, failed: [] }
            };
          `,
          { path, patches },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_search": {
        const query = args.query as string;
        const limit = (args.limit as number) || 20;
        // Use injected helper for efficient search with early termination
        await this.cdp.ensureHelpers();
        const result = await this.cdp.safeEvaluate(
          `return window.__mcpHelpers.searchFiles(__args.query.toLowerCase(), __args.limit);`,
          { query, limit },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_omnisearch": {
        const query = args.query as string;
        const limit = (args.limit as number) || 10;
        const result = await this.cdp.safeEvaluate(
          `
            const omnisearch = app.plugins.plugins['omnisearch'];
            if (!omnisearch) {
              return { error: "Omnisearch plugin is not installed. Please install it from Obsidian community plugins." };
            }
            if (!omnisearch.api) {
              return { error: "Omnisearch API is not available. Please make sure Omnisearch plugin is enabled." };
            }
            const results = await omnisearch.api.search(__args.query);
            return results.slice(0, __args.limit).map(r => ({
              score: r.score,
              path: r.path,
              basename: r.basename,
              foundWords: r.foundWords,
              matches: r.matches?.slice(0, 10),
              excerpt: r.excerpt
            }));
          `,
          { query, limit },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_list_plugins": {
        const enabledOnly = args.enabled_only as boolean;
        const result = await this.cdp.safeEvaluate(
          `
            return Object.entries(app.plugins.plugins)
              .filter(([id]) => __args.enabledOnly ? app.plugins.enabledPlugins.has(id) : true)
              .map(([id, p]) => ({
                id,
                name: p.manifest.name,
                version: p.manifest.version,
                enabled: app.plugins.enabledPlugins.has(id),
                description: p.manifest.description
              }));
          `,
          { enabledOnly },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_execute_command": {
        const commandId = args.command_id as string;
        const result = await this.cdp.safeEvaluate(
          `
            const cmd = app.commands.commands[__args.commandId];
            if (!cmd) return { error: "Command not found: " + __args.commandId };
            app.commands.executeCommandById(__args.commandId);
            return { success: true, command: cmd.name };
          `,
          { commandId },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_list_commands": {
        const filter = (args.filter as string) || "";
        const result = await this.cdp.safeEvaluate(
          `
            const f = __args.filter.toLowerCase();
            return Object.entries(app.commands.commands)
              .filter(([id, cmd]) => !f || id.toLowerCase().includes(f) || cmd.name.toLowerCase().includes(f))
              .map(([id, cmd]) => ({ id, name: cmd.name }))
              .slice(0, 100);
          `,
          { filter },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
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
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_open_file": {
        const path = args.path as string;
        const newLeaf = args.new_leaf as boolean;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, newLeaf } = __args;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            await app.workspace.openLinkText(path, "", newLeaf);
            return { success: true, path };
          `,
          { path, newLeaf },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_dom_query": {
        const selector = args.selector as string;
        const attribute = (args.attribute as string) || "innerHTML";
        const all = args.all as boolean;

        const result = await this.cdp.safeEvaluate(
          `
            const { selector, attribute, all } = __args;
            const getValue = (el) => {
              if (attribute === "text") return el.textContent;
              if (attribute === "innerHTML") return el.innerHTML.substring(0, 2000);
              return el.getAttribute(attribute);
            };
            
            if (all) {
              return Array.from(document.querySelectorAll(selector))
                .slice(0, 20)
                .map(getValue);
            } else {
              const el = document.querySelector(selector);
              return el ? getValue(el) : null;
            }
          `,
          { selector, attribute, all },
          false
        );
        return {
          content: [{ type: "text", text: typeof result === "string" ? result : JSON.stringify(result) }],
        };
      }

      case "obsidian_get_backlinks": {
        const path = args.path as string;
        const result = await this.cdp.safeEvaluate(
          `
            const path = __args.path;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            const backlinks = app.metadataCache.getBacklinksForFile(file);
            if (!backlinks) return { path, backlinks: [] };
            const data = backlinks.data;
            return {
              path,
              backlinks: Object.entries(data).map(([filePath, links]) => ({
                file: filePath,
                count: links.length,
                positions: links.slice(0, 5).map(l => ({ line: l.position?.start?.line, col: l.position?.start?.col }))
              }))
            };
          `,
          { path },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_get_outlinks": {
        const path = args.path as string;
        const result = await this.cdp.safeEvaluate(
          `
            const path = __args.path;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            const cache = app.metadataCache.getFileCache(file);
            if (!cache) return { path, outlinks: [] };
            const links = cache.links || [];
            const embeds = cache.embeds || [];
            return {
              path,
              outlinks: links.map(l => ({
                link: l.link,
                displayText: l.displayText,
                resolved: !!app.metadataCache.getFirstLinkpathDest(l.link, path)
              })),
              embeds: embeds.map(e => ({
                link: e.link,
                resolved: !!app.metadataCache.getFirstLinkpathDest(e.link, path)
              }))
            };
          `,
          { path },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_get_tags": {
        const path = args.path as string | undefined;
        const result = await this.cdp.safeEvaluate(
          `
            const path = __args.path;
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
          `,
          { path },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_get_frontmatter": {
        const path = args.path as string;
        const result = await this.cdp.safeEvaluate(
          `
            const path = __args.path;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            const cache = app.metadataCache.getFileCache(file);
            return {
              path,
              frontmatter: cache?.frontmatter || null,
              position: cache?.frontmatterPosition || null
            };
          `,
          { path },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_update_frontmatter": {
        const path = args.path as string;
        const properties = args.properties as Record<string, unknown>;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, properties } = __args;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            await app.fileManager.processFrontMatter(file, (fm) => {
              for (const [key, value] of Object.entries(properties)) {
                if (value === null) {
                  delete fm[key];
                } else {
                  fm[key] = value;
                }
              }
            });
            return { success: true, path, updated: Object.keys(properties) };
          `,
          { path, properties },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      // TODO: Dataview 接口暂时屏蔽
      // case "obsidian_dataview_query": {
      //   const query = args.query as string;
      //   const result = await this.cdp.safeEvaluate(
      //     `
      //       const dv = app.plugins.plugins['dataview'];
      //       if (!dv) return { error: "Dataview plugin is not installed." };
      //       if (!dv.api) return { error: "Dataview API is not available. Make sure the plugin is enabled." };
      //       
      //       try {
      //         const result = await dv.api.query(__args.query);
      //         if (!result.successful) {
      //           return { error: result.error };
      //         }
      //         
      //         const value = result.value;
      //         if (value.type === 'list') {
      //           return {
      //             type: 'list',
      //             values: value.values.slice(0, 100).map(v => {
      //               if (v?.path) return { type: 'file', path: v.path };
      //               return v;
      //             })
      //           };
      //         } else if (value.type === 'table') {
      //           return {
      //             type: 'table',
      //             headers: value.headers,
      //             values: value.values.slice(0, 100).map(row => 
      //               row.map(cell => {
      //                 if (cell?.path) return { type: 'file', path: cell.path };
      //                 if (cell?.ts) return cell.toString();
      //                 return cell;
      //               })
      //             )
      //           };
      //         } else if (value.type === 'task') {
      //           return {
      //             type: 'task',
      //             values: value.values.slice(0, 100).map(t => ({
      //               text: t.text,
      //               completed: t.completed,
      //               path: t.path,
      //               line: t.line
      //             }))
      //           };
      //         }
      //         return value;
      //       } catch (e) {
      //         return { error: e.message };
      //       }
      //     `,
      //     { query },
      //     true
      //   );
      //   return {
      //     content: [{ type: "text", text: JSON.stringify(result) }],
      //   };
      // }

      case "obsidian_list_folder": {
        const path = (args.path as string) || "";
        const recursive = args.recursive as boolean;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, recursive } = __args;
            const normalizedPath = path.replace(/^\/+/, '');
            const folder = normalizedPath ? app.vault.getAbstractFileByPath(normalizedPath) : app.vault.getRoot();
            if (!folder) return { error: "Folder not found: " + path };
            if (!folder.children) return { error: "Not a folder: " + path };
            
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
              path: normalizedPath || '/',
              contents: listFolder(folder, recursive)
            };
          `,
          { path, recursive },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_create_folder": {
        const path = args.path as string;
        const result = await this.cdp.safeEvaluate(
          `
            const path = __args.path;
            const existing = app.vault.getAbstractFileByPath(path);
            if (existing) return { error: "Path already exists: " + path };
            await app.vault.createFolder(path);
            return { success: true, path };
          `,
          { path },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_move_file": {
        const from = args.from as string;
        const to = args.to as string;
        const result = await this.cdp.safeEvaluate(
          `
            const { from, to } = __args;
            const file = app.vault.getAbstractFileByPath(from);
            if (!file) return { error: "File not found: " + from };
            await app.fileManager.renameFile(file, to);
            return { success: true, from, to };
          `,
          { from, to },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_delete_file": {
        const path = args.path as string;
        const permanent = args.permanent as boolean;
        const result = await this.cdp.safeEvaluate(
          `
            const { path, permanent } = __args;
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return { error: "File not found: " + path };
            if (permanent) {
              await app.vault.delete(file);
            } else {
              await app.vault.trash(file, false);
            }
            return { success: true, path, permanent };
          `,
          { path, permanent },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
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
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_replace_selection": {
        const text = args.text as string;
        const result = await this.cdp.safeEvaluate(
          `
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const oldSelection = editor.getSelection();
            editor.replaceSelection(__args.text);
            return {
              success: true,
              replaced: oldSelection,
              with: __args.text
            };
          `,
          { text },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_insert_at_cursor": {
        const text = args.text as string;
        const result = await this.cdp.safeEvaluate(
          `
            const editor = app.workspace.activeEditor?.editor;
            if (!editor) return { error: "No active editor" };
            const cursor = editor.getCursor();
            editor.replaceRange(__args.text, cursor);
            return {
              success: true,
              inserted: __args.text,
              at: { line: cursor.line, ch: cursor.ch }
            };
          `,
          { text },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
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
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_list_templates": {
        const result = await this.cdp.evaluate(`
          (() => {
            const templatesPlugin = app.internalPlugins.plugins['templates'];
            if (!templatesPlugin?.enabled) {
              return { error: "Templates plugin is not enabled" };
            }
            const templateFolder = templatesPlugin.instance?.options?.folder;
            if (!templateFolder) {
              return { error: "Templates folder not configured" };
            }
            const folder = app.vault.getAbstractFileByPath(templateFolder);
            if (!folder || !folder.children) {
              return { error: "Templates folder not found: " + templateFolder };
            }
            const templates = folder.children
              .filter(f => f.extension === 'md')
              .map(f => ({
                name: f.basename,
                path: f.path
              }));
            return {
              folder: templateFolder,
              templates
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_apply_template": {
        const template = args.template as string;
        const target = args.target as string | undefined;
        const result = await this.cdp.safeEvaluate(
          `
            const { template, target } = __args;
            const templatesPlugin = app.internalPlugins.plugins['templates'];
            if (!templatesPlugin?.enabled) {
              return { error: "Templates plugin is not enabled" };
            }
            const templateFolder = templatesPlugin.instance?.options?.folder || '';
            
            // Find template file
            let templatePath = template;
            if (!templatePath.endsWith('.md')) templatePath += '.md';
            if (!templatePath.startsWith(templateFolder)) {
              templatePath = templateFolder + '/' + templatePath;
            }
            
            const templateFile = app.vault.getAbstractFileByPath(templatePath);
            if (!templateFile) {
              return { error: "Template not found: " + templatePath };
            }
            
            // Get or create target file
            let targetFile;
            if (target) {
              targetFile = app.vault.getAbstractFileByPath(target);
              if (!targetFile) {
                await app.vault.create(target, '');
                targetFile = app.vault.getAbstractFileByPath(target);
              }
              await app.workspace.openLinkText(target, '', false);
            } else {
              targetFile = app.workspace.getActiveFile();
            }
            
            if (!targetFile) {
              return { error: "No target file available" };
            }
            
            // Read template content and append to target
            const templateContent = await app.vault.read(templateFile);
            const currentContent = await app.vault.read(targetFile);
            await app.vault.modify(targetFile, currentContent + templateContent);
            
            return {
              success: true,
              template: templatePath,
              target: targetFile.path
            };
          `,
          { template, target },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_get_all_properties": {
        const result = await this.cdp.evaluate(`
          (() => {
            const allProps = app.metadataCache.getAllPropertyInfos();
            if (!allProps) return { properties: [] };
            return {
              properties: Object.entries(allProps).map(([name, info]) => ({
                name,
                type: info.type,
                count: info.count
              })).sort((a, b) => b.count - a.count)
            };
          })()
        `);
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_resolve_link": {
        const link = args.link as string;
        const source = (args.source as string) || "";
        const cleanedLink = link.replace(/^\[\[|\]\]$/g, '');
        const result = await this.cdp.safeEvaluate(
          `
            const { link, source } = __args;
            const resolved = app.metadataCache.getFirstLinkpathDest(link, source);
            if (!resolved) {
              return {
                link,
                resolved: false,
                path: null
              };
            }
            return {
              link,
              resolved: true,
              path: resolved.path,
              name: resolved.name,
              basename: resolved.basename
            };
          `,
          { link: cleanedLink, source },
          false
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_search_community_plugins": {
        const query = args.query as string;
        const limit = (args.limit as number) || 20;
        const result = await this.cdp.safeEvaluate(
          `
            try {
              const response = await fetch('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json');
              if (!response.ok) {
                return { error: "Failed to fetch community plugins list: " + response.status };
              }
              const plugins = await response.json();
              const queryLower = __args.query.toLowerCase();
              const matches = plugins.filter(p => 
                p.id.toLowerCase().includes(queryLower) || 
                p.name.toLowerCase().includes(queryLower) || 
                p.description.toLowerCase().includes(queryLower)
              ).slice(0, __args.limit);
              
              // Mark installed plugins
              const installed = new Set(Object.keys(app.plugins.manifests));
              return matches.map(p => ({
                id: p.id,
                name: p.name,
                author: p.author,
                description: p.description,
                repo: p.repo,
                installed: installed.has(p.id),
                enabled: app.plugins.enabledPlugins.has(p.id)
              }));
            } catch (e) {
              return { error: e.message };
            }
          `,
          { query, limit },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_install_plugin": {
        const pluginId = args.plugin_id as string;
        const enable = args.enable !== false;
        const result = await this.cdp.safeEvaluate(
          `
            const { pluginId, enable } = __args;
            try {
              // Check if already installed
              if (app.plugins.manifests[pluginId]) {
                return { 
                  error: "Plugin is already installed: " + pluginId,
                  installed: true,
                  enabled: app.plugins.enabledPlugins.has(pluginId)
                };
              }
              
              // Fetch plugin list to get repo info
              const response = await fetch('https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugins.json');
              const plugins = await response.json();
              const plugin = plugins.find(p => p.id === pluginId);
              
              if (!plugin) {
                return { error: "Plugin not found in community repository: " + pluginId };
              }
              
              // Fetch latest release info
              const releaseResponse = await fetch('https://api.github.com/repos/' + plugin.repo + '/releases/latest');
              if (!releaseResponse.ok) {
                return { error: "Failed to fetch release info: " + releaseResponse.status };
              }
              const release = await releaseResponse.json();
              
              // Fetch manifest from release
              const manifestAsset = release.assets.find(a => a.name === 'manifest.json');
              if (!manifestAsset) {
                return { error: "No manifest.json found in latest release" };
              }
              const manifestResponse = await fetch(manifestAsset.browser_download_url);
              const manifest = await manifestResponse.json();
              
              // Install the plugin
              await app.plugins.installPlugin(plugin.repo, release.tag_name, manifest);
              
              // Enable if requested
              if (enable) {
                await app.plugins.enablePluginAndSave(pluginId);
              }
              
              return {
                success: true,
                id: pluginId,
                name: manifest.name,
                version: manifest.version,
                enabled: enable
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId, enable },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_enable_plugin": {
        const pluginId = args.plugin_id as string;
        const result = await this.cdp.safeEvaluate(
          `
            const pluginId = __args.pluginId;
            try {
              const manifest = app.plugins.manifests[pluginId];
              if (!manifest) {
                return { error: "Plugin not installed: " + pluginId };
              }
              
              if (app.plugins.enabledPlugins.has(pluginId)) {
                return { 
                  success: true, 
                  id: pluginId,
                  name: manifest.name,
                  message: "Plugin was already enabled"
                };
              }
              
              await app.plugins.enablePluginAndSave(pluginId);
              
              return {
                success: true,
                id: pluginId,
                name: manifest.name,
                enabled: true
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_disable_plugin": {
        const pluginId = args.plugin_id as string;
        const result = await this.cdp.safeEvaluate(
          `
            const pluginId = __args.pluginId;
            try {
              const manifest = app.plugins.manifests[pluginId];
              if (!manifest) {
                return { error: "Plugin not installed: " + pluginId };
              }
              
              if (!app.plugins.enabledPlugins.has(pluginId)) {
                return { 
                  success: true, 
                  id: pluginId,
                  name: manifest.name,
                  message: "Plugin was already disabled"
                };
              }
              
              await app.plugins.disablePluginAndSave(pluginId);
              
              return {
                success: true,
                id: pluginId,
                name: manifest.name,
                enabled: false
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_uninstall_plugin": {
        const pluginId = args.plugin_id as string;
        const result = await this.cdp.safeEvaluate(
          `
            const pluginId = __args.pluginId;
            try {
              const manifest = app.plugins.manifests[pluginId];
              if (!manifest) {
                return { error: "Plugin not installed: " + pluginId };
              }
              
              const pluginName = manifest.name;
              await app.plugins.uninstallPlugin(pluginId);
              
              return {
                success: true,
                id: pluginId,
                name: pluginName,
                uninstalled: true
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_get_plugin_settings": {
        const pluginId = args.plugin_id as string;
        const result = await this.cdp.safeEvaluate(
          `
            const pluginId = __args.pluginId;
            try {
              const plugin = app.plugins.plugins[pluginId];
              if (!plugin) {
                return { error: "Plugin not found or not enabled: " + pluginId };
              }
              
              // Try to get settings from plugin instance
              let settings = null;
              if (plugin.settings) {
                settings = plugin.settings;
              } else if (plugin.data) {
                settings = plugin.data;
              }
              
              // Also try to load from data.json
              const dataPath = plugin.manifest.dir + '/data.json';
              let fileSettings = null;
              try {
                const adapter = app.vault.adapter;
                if (await adapter.exists(dataPath)) {
                  const content = await adapter.read(dataPath);
                  fileSettings = JSON.parse(content);
                }
              } catch (e) {
                // Ignore file read errors
              }
              
              return {
                id: pluginId,
                name: plugin.manifest.name,
                settings: settings || fileSettings || {},
                hasSettings: !!(settings || fileSettings)
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      case "obsidian_set_plugin_settings": {
        const pluginId = args.plugin_id as string;
        const settings = args.settings as Record<string, unknown>;
        const result = await this.cdp.safeEvaluate(
          `
            const { pluginId, settings } = __args;
            try {
              const plugin = app.plugins.plugins[pluginId];
              if (!plugin) {
                return { error: "Plugin not found or not enabled: " + pluginId };
              }
              
              // Update in-memory settings
              if (plugin.settings) {
                Object.assign(plugin.settings, settings);
              }
              
              // Try to save using plugin's saveData method
              if (typeof plugin.saveData === 'function') {
                const currentData = plugin.settings || plugin.data || {};
                const mergedData = { ...currentData, ...settings };
                await plugin.saveData(mergedData);
                
                // Also reload settings if plugin has loadSettings method
                if (typeof plugin.loadSettings === 'function') {
                  await plugin.loadSettings();
                }
                
                return {
                  success: true,
                  id: pluginId,
                  name: plugin.manifest.name,
                  updated: Object.keys(settings)
                };
              }
              
              // Fallback: directly write to data.json
              const dataPath = plugin.manifest.dir + '/data.json';
              const adapter = app.vault.adapter;
              let existingData = {};
              try {
                if (await adapter.exists(dataPath)) {
                  const content = await adapter.read(dataPath);
                  existingData = JSON.parse(content);
                }
              } catch (e) {
                // Ignore
              }
              
              const mergedData = { ...existingData, ...settings };
              await adapter.write(dataPath, JSON.stringify(mergedData, null, 2));
              
              return {
                success: true,
                id: pluginId,
                name: plugin.manifest.name,
                updated: Object.keys(settings),
                note: "Settings saved to file. Plugin may need to be reloaded for changes to take effect."
              };
            } catch (e) {
              return { error: e.message };
            }
          `,
          { pluginId, settings },
          true
        );
        return {
          content: [{ type: "text", text: JSON.stringify(result) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
