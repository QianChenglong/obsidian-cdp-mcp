/**
 * Integration tests that require a running Obsidian instance with debug mode enabled.
 *
 * To run these tests:
 * 1. Start Obsidian with: open -a Obsidian --args --remote-debugging-port=9222
 * 2. Run: npm run test:integration
 *
 * These tests are skipped in CI environments.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { CDPClient } from "../src/cdp-client.js";
import { ToolHandler } from "../src/tools.js";

const SKIP_INTEGRATION =
  process.env.CI === "true" || process.env.SKIP_INTEGRATION === "true";

describe.skipIf(SKIP_INTEGRATION)("Integration Tests", () => {
  let cdp: CDPClient;
  let handler: ToolHandler;

  beforeAll(async () => {
    cdp = new CDPClient(9222);
    handler = new ToolHandler(cdp);

    // Try to connect, skip if Obsidian is not available
    try {
      await cdp.connect();
    } catch (error) {
      console.warn("Skipping integration tests: Obsidian not running in debug mode");
      throw error;
    }
  });

  afterAll(() => {
    cdp?.disconnect();
  });

  describe("CDPClient", () => {
    it("should connect to Obsidian", async () => {
      // Connection already established in beforeAll
      const targets = await cdp.getTargets();
      expect(targets.length).toBeGreaterThan(0);
    });

    it("should find Obsidian target", async () => {
      const target = await cdp.findObsidianTarget();
      expect(target).not.toBeNull();
      expect(target?.type).toBe("page");
    });

    it("should evaluate simple expression", async () => {
      const result = await cdp.evaluate<number>("1 + 1");
      expect(result).toBe(2);
    });

    it("should access app object", async () => {
      const result = await cdp.evaluate<boolean>("typeof app !== 'undefined'");
      expect(result).toBe(true);
    });

    it("should capture screenshot", async () => {
      const screenshot = await cdp.screenshot("png");
      expect(screenshot).toBeTruthy();
      expect(typeof screenshot).toBe("string");
      // Should be base64 encoded
      expect(() => Buffer.from(screenshot, "base64")).not.toThrow();
    });
  });

  describe("ToolHandler - Vault Operations", () => {
    it("should get vault info", async () => {
      const result = await handler.handle("obsidian_get_vault_info", {});
      const vaultInfo = JSON.parse(result.content[0].text!);

      expect(vaultInfo.name).toBeTruthy();
      expect(typeof vaultInfo.fileCount).toBe("number");
      expect(typeof vaultInfo.folderCount).toBe("number");
      expect(vaultInfo.configDir).toBe(".obsidian");
    });

    it("should search files", async () => {
      const result = await handler.handle("obsidian_search", {
        query: ".md",
        limit: 5,
      });
      const files = JSON.parse(result.content[0].text!);

      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeLessThanOrEqual(5);
    });
  });

  describe("ToolHandler - Plugin Operations", () => {
    it("should list plugins", async () => {
      const result = await handler.handle("obsidian_list_plugins", {});
      const plugins = JSON.parse(result.content[0].text!);

      expect(Array.isArray(plugins)).toBe(true);
      // Obsidian should have at least some core plugins
    });

    it("should list commands", async () => {
      const result = await handler.handle("obsidian_list_commands", { filter: "app:" });
      const commands = JSON.parse(result.content[0].text!);

      expect(Array.isArray(commands)).toBe(true);
      expect(commands.length).toBeGreaterThan(0);
      // All commands should match filter
      expect(
        commands.every((cmd: { id: string }) => cmd.id.toLowerCase().includes("app:"))
      ).toBe(true);
    });
  });

  describe("ToolHandler - Debug Capabilities", () => {
    it("should take screenshot and save to file", async () => {
      const result = await handler.handle("obsidian_screenshot", { format: "png" });

      expect(result.content[0].type).toBe("text");
      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.success).toBe(true);
      expect(parsed.path).toBeTruthy();
      expect(parsed.format).toBe("png");
    });

    it("should take JPEG screenshot with quality", async () => {
      const result = await handler.handle("obsidian_screenshot", {
        format: "jpeg",
        quality: 50,
      });

      const parsed = JSON.parse(result.content[0].text!);
      expect(parsed.format).toBe("jpeg");
      expect(parsed.quality).toBe(50);
    });

    it("should execute JavaScript", async () => {
      const result = await handler.handle("obsidian_eval", {
        code: "app.vault.getName()",
      });
      const vaultName = JSON.parse(result.content[0].text!);

      expect(typeof vaultName).toBe("string");
      expect(vaultName.length).toBeGreaterThan(0);
    });

    it("should query DOM elements", async () => {
      const result = await handler.handle("obsidian_dom_query", {
        selector: ".app-container",
      });

      // Should return innerHTML or null
      expect(result.content[0].text).toBeDefined();
    });

    it("should get console messages", async () => {
      // First, log something to console
      await handler.handle("obsidian_eval", {
        code: 'console.log("Integration test log message")',
      });

      // Wait a bit for message to be captured
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await handler.handle("obsidian_console", { limit: 10 });
      const messages = JSON.parse(result.content[0].text!);

      expect(Array.isArray(messages)).toBe(true);
    });
  });

  describe("ToolHandler - File Operations", () => {
    const testFilePath = "_test_integration_file.md";
    const testContent = `# Integration Test File

Created at: ${new Date().toISOString()}

This file is created by integration tests and should be deleted.`;

    it("should create a new file", async () => {
      const result = await handler.handle("obsidian_write_file", {
        path: testFilePath,
        content: testContent,
      });
      const response = JSON.parse(result.content[0].text!);

      expect(response.success).toBe(true);
      expect(response.action).toBe("created");
    });

    it("should read the created file", async () => {
      const result = await handler.handle("obsidian_read_file", {
        path: testFilePath,
      });

      expect(result.content[0].text).toContain("Integration Test File");
    });

    it("should modify the file", async () => {
      const newContent = testContent + "\n\nModified by test.";
      const result = await handler.handle("obsidian_write_file", {
        path: testFilePath,
        content: newContent,
      });
      const response = JSON.parse(result.content[0].text!);

      expect(response.success).toBe(true);
      expect(response.action).toBe("modified");
    });

    it("should open the file", async () => {
      const result = await handler.handle("obsidian_open_file", {
        path: testFilePath,
      });
      const response = JSON.parse(result.content[0].text!);

      expect(response.success).toBe(true);
    });

    it("should get active file info", async () => {
      // Wait a bit for file to open
      await new Promise((resolve) => setTimeout(resolve, 200));

      const result = await handler.handle("obsidian_get_active_file", {});
      const fileInfo = JSON.parse(result.content[0].text!);

      // Active file might be different, but should have expected structure
      if (fileInfo) {
        expect(fileInfo.path).toBeDefined();
        expect(fileInfo.name).toBeDefined();
        expect(fileInfo.extension).toBeDefined();
      }
    });

    // Cleanup: delete test file
    afterAll(async () => {
      try {
        await cdp.evaluate(
          `
          (async () => {
            const file = app.vault.getAbstractFileByPath("${testFilePath}");
            if (file) await app.vault.delete(file);
          })()
        `,
          true
        );
      } catch {
        // Ignore cleanup errors
      }
    });
  });
});

describe("Connection Error Handling", () => {
  it("should throw error when Obsidian is not running", async () => {
    const cdp = new CDPClient(19999); // Use a port that's likely not in use
    await expect(cdp.getTargets()).rejects.toThrow();
  });
});
