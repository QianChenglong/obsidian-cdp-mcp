import { describe, it, expect, vi, beforeEach } from "vitest";
import { ToolHandler, toolDefinitions } from "../src/tools.js";
import type { CDPClient } from "../src/cdp-client.js";

// Create a mock CDPClient
function createMockCDPClient(overrides: Partial<CDPClient> = {}): CDPClient {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    send: vi.fn().mockResolvedValue({}),
    evaluate: vi.fn().mockResolvedValue(null),
    screenshot: vi.fn().mockResolvedValue("base64imagedata"),
    getConsoleMessages: vi.fn().mockReturnValue([]),
    clearConsoleMessages: vi.fn(),
    getTargets: vi.fn().mockResolvedValue([]),
    findObsidianTarget: vi.fn().mockResolvedValue(null),
    ...overrides,
  } as unknown as CDPClient;
}

describe("ToolHandler", () => {
  let mockCdp: CDPClient;
  let handler: ToolHandler;

  beforeEach(() => {
    mockCdp = createMockCDPClient();
    handler = new ToolHandler(mockCdp);
  });

  describe("obsidian_screenshot", () => {
    it("should capture screenshot in default PNG format", async () => {
      const result = await handler.handle("obsidian_screenshot", {});

      expect(mockCdp.screenshot).toHaveBeenCalledWith("png", undefined);
      expect(result.content[0]).toEqual({
        type: "image",
        data: "base64imagedata",
        mimeType: "image/png",
      });
    });

    it("should capture screenshot in JPEG format with quality", async () => {
      const result = await handler.handle("obsidian_screenshot", {
        format: "jpeg",
        quality: 80,
      });

      expect(mockCdp.screenshot).toHaveBeenCalledWith("jpeg", 80);
      expect(result.content[0].mimeType).toBe("image/jpeg");
    });
  });

  describe("obsidian_console", () => {
    it("should return console messages", async () => {
      const mockMessages = [
        { type: "log", text: "Hello", timestamp: 1000 },
        { type: "error", text: "Error!", timestamp: 2000 },
      ];
      mockCdp.getConsoleMessages = vi.fn().mockReturnValue(mockMessages);

      const result = await handler.handle("obsidian_console", {});

      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(mockMessages);
    });

    it("should filter messages by type", async () => {
      const mockMessages = [
        { type: "log", text: "Hello", timestamp: 1000 },
        { type: "error", text: "Error!", timestamp: 2000 },
        { type: "error", text: "Another error", timestamp: 3000 },
      ];
      mockCdp.getConsoleMessages = vi.fn().mockReturnValue(mockMessages);

      const result = await handler.handle("obsidian_console", { type: "error" });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toHaveLength(2);
      expect(parsed.every((m: { type: string }) => m.type === "error")).toBe(true);
    });

    it("should limit number of messages", async () => {
      const mockMessages = Array.from({ length: 100 }, (_, i) => ({
        type: "log",
        text: `Message ${i}`,
        timestamp: i * 1000,
      }));
      mockCdp.getConsoleMessages = vi.fn().mockReturnValue(mockMessages);

      const result = await handler.handle("obsidian_console", { limit: 10 });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toHaveLength(10);
      // Should return last 10 messages
      expect(parsed[0].text).toBe("Message 90");
    });

    it("should clear messages when requested", async () => {
      mockCdp.getConsoleMessages = vi.fn().mockReturnValue([]);

      await handler.handle("obsidian_console", { clear: true });

      expect(mockCdp.clearConsoleMessages).toHaveBeenCalled();
    });
  });

  describe("obsidian_eval", () => {
    it("should evaluate JavaScript code", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ foo: "bar" });

      const result = await handler.handle("obsidian_eval", { code: "1 + 1" });

      expect(mockCdp.evaluate).toHaveBeenCalledWith("1 + 1", true);
      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual({ foo: "bar" });
    });

    it("should not await promise when await_promise is false", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue(42);

      await handler.handle("obsidian_eval", {
        code: "Promise.resolve(42)",
        await_promise: false,
      });

      expect(mockCdp.evaluate).toHaveBeenCalledWith("Promise.resolve(42)", false);
    });
  });

  describe("obsidian_get_active_file", () => {
    it("should return active file info", async () => {
      const fileInfo = {
        path: "notes/test.md",
        name: "test.md",
        basename: "test",
        extension: "md",
      };
      mockCdp.evaluate = vi.fn().mockResolvedValue(fileInfo);

      const result = await handler.handle("obsidian_get_active_file", {});

      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(fileInfo);
    });

    it("should return null when no file is active", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue(null);

      const result = await handler.handle("obsidian_get_active_file", {});

      expect(JSON.parse(result.content[0].text!)).toBeNull();
    });
  });

  describe("obsidian_read_file", () => {
    it("should read file content", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue("# Hello World\n\nContent here");

      const result = await handler.handle("obsidian_read_file", {
        path: "notes/test.md",
      });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(
        expect.stringContaining("notes/test.md"),
        true
      );
      expect(result.content[0].text).toBe("# Hello World\n\nContent here");
    });

    it("should return error for non-existent file", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ error: "File not found: missing.md" });

      const result = await handler.handle("obsidian_read_file", {
        path: "missing.md",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.error).toContain("File not found");
    });
  });

  describe("obsidian_write_file", () => {
    it("should create new file", async () => {
      mockCdp.evaluate = vi
        .fn()
        .mockResolvedValue({ success: true, action: "created", path: "new.md" });

      const result = await handler.handle("obsidian_write_file", {
        path: "new.md",
        content: "New content",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.success).toBe(true);
      expect(parsed.action).toBe("created");
    });

    it("should modify existing file", async () => {
      mockCdp.evaluate = vi
        .fn()
        .mockResolvedValue({ success: true, action: "modified", path: "existing.md" });

      const result = await handler.handle("obsidian_write_file", {
        path: "existing.md",
        content: "Updated content",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.action).toBe("modified");
    });

    it("should escape special characters in content", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ success: true });

      await handler.handle("obsidian_write_file", {
        path: "test.md",
        content: 'Content with "quotes" and\nnewlines',
      });

      // Verify the content was properly escaped
      expect(mockCdp.evaluate).toHaveBeenCalled();
    });
  });

  describe("obsidian_search", () => {
    it("should search files by path", async () => {
      const searchResults = [
        { path: "notes/test.md", name: "test.md", extension: "md" },
        { path: "notes/testing.md", name: "testing.md", extension: "md" },
      ];
      mockCdp.evaluate = vi.fn().mockResolvedValue(searchResults);

      const result = await handler.handle("obsidian_search", { query: "test" });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(searchResults);
    });

    it("should respect limit parameter", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue([]);

      await handler.handle("obsidian_search", { query: "test", limit: 5 });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining(".slice(0, 5)"));
    });
  });

  describe("obsidian_list_plugins", () => {
    it("should list all plugins", async () => {
      const plugins = [
        { id: "plugin1", name: "Plugin 1", version: "1.0.0", enabled: true },
        { id: "plugin2", name: "Plugin 2", version: "2.0.0", enabled: false },
      ];
      mockCdp.evaluate = vi.fn().mockResolvedValue(plugins);

      const result = await handler.handle("obsidian_list_plugins", {});

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(plugins);
    });

    it("should filter enabled plugins only", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue([]);

      await handler.handle("obsidian_list_plugins", { enabled_only: true });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining("true ?"));
    });
  });

  describe("obsidian_execute_command", () => {
    it("should execute command by ID", async () => {
      mockCdp.evaluate = vi
        .fn()
        .mockResolvedValue({ success: true, command: "Toggle Fold" });

      const result = await handler.handle("obsidian_execute_command", {
        command_id: "editor:toggle-fold",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.success).toBe(true);
    });

    it("should return error for unknown command", async () => {
      mockCdp.evaluate = vi
        .fn()
        .mockResolvedValue({ error: "Command not found: unknown:command" });

      const result = await handler.handle("obsidian_execute_command", {
        command_id: "unknown:command",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.error).toContain("Command not found");
    });
  });

  describe("obsidian_list_commands", () => {
    it("should list all commands", async () => {
      const commands = [
        { id: "editor:toggle-fold", name: "Toggle Fold" },
        { id: "app:go-back", name: "Go Back" },
      ];
      mockCdp.evaluate = vi.fn().mockResolvedValue(commands);

      const result = await handler.handle("obsidian_list_commands", {});

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(commands);
    });

    it("should filter commands by name", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue([]);

      await handler.handle("obsidian_list_commands", { filter: "fold" });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining("fold"));
    });
  });

  describe("obsidian_get_vault_info", () => {
    it("should return vault information", async () => {
      const vaultInfo = {
        name: "My Vault",
        fileCount: 100,
        folderCount: 10,
        configDir: ".obsidian",
        adapter: "/path/to/vault",
      };
      mockCdp.evaluate = vi.fn().mockResolvedValue(vaultInfo);

      const result = await handler.handle("obsidian_get_vault_info", {});

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(vaultInfo);
    });
  });

  describe("obsidian_open_file", () => {
    it("should open file", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ success: true, path: "notes/test.md" });

      const result = await handler.handle("obsidian_open_file", {
        path: "notes/test.md",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.success).toBe(true);
    });

    it("should open file in new leaf", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ success: true });

      await handler.handle("obsidian_open_file", {
        path: "notes/test.md",
        new_leaf: true,
      });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining("true)"), true);
    });

    it("should return error for non-existent file", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue({ error: "File not found: missing.md" });

      const result = await handler.handle("obsidian_open_file", {
        path: "missing.md",
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.error).toContain("File not found");
    });
  });

  describe("obsidian_dom_query", () => {
    it("should query single element", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue("<div>Content</div>");

      const result = await handler.handle("obsidian_dom_query", {
        selector: ".workspace",
      });

      expect(result.content[0].text).toBe("<div>Content</div>");
    });

    it("should query all matching elements", async () => {
      const elements = ["<div>1</div>", "<div>2</div>"];
      mockCdp.evaluate = vi.fn().mockResolvedValue(elements);

      const result = await handler.handle("obsidian_dom_query", {
        selector: ".item",
        all: true,
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed).toEqual(elements);
    });

    it("should extract text content", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue("Plain text");

      await handler.handle("obsidian_dom_query", {
        selector: ".title",
        attribute: "text",
      });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining('"text"'));
    });

    it("should extract custom attribute", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue("custom-value");

      await handler.handle("obsidian_dom_query", {
        selector: "[data-type]",
        attribute: "data-type",
      });

      expect(mockCdp.evaluate).toHaveBeenCalledWith(expect.stringContaining('"data-type"'));
    });

    it("should return null for non-existent element", async () => {
      mockCdp.evaluate = vi.fn().mockResolvedValue(null);

      const result = await handler.handle("obsidian_dom_query", {
        selector: ".nonexistent",
      });

      expect(JSON.parse(result.content[0].text!)).toBeNull();
    });
  });

  describe("unknown tool", () => {
    it("should throw error for unknown tool", async () => {
      await expect(handler.handle("unknown_tool", {})).rejects.toThrow("Unknown tool");
    });
  });
});

describe("toolDefinitions", () => {
  it("should have all expected tools", () => {
    const toolNames = toolDefinitions.map((t) => t.name);
    expect(toolNames).toContain("obsidian_screenshot");
    expect(toolNames).toContain("obsidian_console");
    expect(toolNames).toContain("obsidian_eval");
    expect(toolNames).toContain("obsidian_get_active_file");
    expect(toolNames).toContain("obsidian_read_file");
    expect(toolNames).toContain("obsidian_write_file");
    expect(toolNames).toContain("obsidian_search");
    expect(toolNames).toContain("obsidian_list_plugins");
    expect(toolNames).toContain("obsidian_execute_command");
    expect(toolNames).toContain("obsidian_list_commands");
    expect(toolNames).toContain("obsidian_get_vault_info");
    expect(toolNames).toContain("obsidian_open_file");
    expect(toolNames).toContain("obsidian_dom_query");
    expect(toolNames).toContain("obsidian_omnisearch");
    expect(toolNames).toContain("obsidian_get_backlinks");
    expect(toolNames).toContain("obsidian_get_outlinks");
    expect(toolNames).toContain("obsidian_get_tags");
    expect(toolNames).toContain("obsidian_get_frontmatter");
    expect(toolNames).toContain("obsidian_update_frontmatter");
    expect(toolNames).toContain("obsidian_dataview_query");
    expect(toolNames).toContain("obsidian_list_folder");
    expect(toolNames).toContain("obsidian_create_folder");
    expect(toolNames).toContain("obsidian_move_file");
    expect(toolNames).toContain("obsidian_delete_file");
    expect(toolNames).toContain("obsidian_get_selection");
    expect(toolNames).toContain("obsidian_replace_selection");
    expect(toolNames).toContain("obsidian_insert_at_cursor");
    expect(toolNames).toContain("obsidian_get_cursor_position");
    expect(toolNames).toContain("obsidian_list_templates");
    expect(toolNames).toContain("obsidian_apply_template");
    expect(toolNames).toContain("obsidian_get_all_properties");
    expect(toolNames).toContain("obsidian_resolve_link");
  });

  it("should have 32 tools total", () => {
    expect(toolDefinitions).toHaveLength(32);
  });

  it("should have valid schema for all tools", () => {
    for (const tool of toolDefinitions) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.inputSchema.properties).toBeDefined();
    }
  });

  it("should have required fields defined correctly", () => {
    const evalTool = toolDefinitions.find((t) => t.name === "obsidian_eval");
    expect(evalTool?.inputSchema.required).toContain("code");

    const readFileTool = toolDefinitions.find((t) => t.name === "obsidian_read_file");
    expect(readFileTool?.inputSchema.required).toContain("path");

    const writeFileTool = toolDefinitions.find((t) => t.name === "obsidian_write_file");
    expect(writeFileTool?.inputSchema.required).toContain("path");
    expect(writeFileTool?.inputSchema.required).toContain("content");
  });
});
