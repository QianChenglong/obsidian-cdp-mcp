import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

// Mock WebSocket
class MockWebSocket extends EventEmitter {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = MockWebSocket.OPEN;

  constructor(public url: string, public options?: unknown) {
    super();
    // Simulate connection in next tick
    setTimeout(() => this.emit("open"), 0);
  }

  send(data: string) {
    const message = JSON.parse(data);
    // Simulate response in next tick
    setTimeout(() => {
      if (message.method === "Runtime.enable") {
        this.emit("message", JSON.stringify({ id: message.id, result: {} }));
      } else if (message.method === "Runtime.evaluate") {
        this.emit(
          "message",
          JSON.stringify({
            id: message.id,
            result: { result: { value: "test result", type: "string" } },
          })
        );
      } else if (message.method === "Page.captureScreenshot") {
        this.emit(
          "message",
          JSON.stringify({
            id: message.id,
            result: { data: "base64screenshotdata" },
          })
        );
      } else {
        this.emit("message", JSON.stringify({ id: message.id, result: {} }));
      }
    }, 0);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.emit("close");
  }
}

// Mock the ws module
vi.mock("ws", () => ({
  default: MockWebSocket,
}));

// Mock fetch for getTargets
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CDPClient", () => {
  let CDPClient: typeof import("../src/cdp-client.js").CDPClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module cache to get fresh mock
    vi.resetModules();
    const module = await import("../src/cdp-client.js");
    CDPClient = module.CDPClient;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("constructor", () => {
    it("should use default port 9222", () => {
      const client = new CDPClient();
      expect(client).toBeDefined();
    });

    it("should accept custom port", () => {
      const client = new CDPClient(9333);
      expect(client).toBeDefined();
    });
  });

  describe("getTargets", () => {
    it("should fetch targets from debug port", async () => {
      const mockTargets = [
        {
          id: "123",
          title: "Obsidian",
          type: "page",
          url: "app://obsidian.md/index.html",
          webSocketDebuggerUrl: "ws://localhost:9222/devtools/page/123",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockTargets),
      });

      const client = new CDPClient();
      const targets = await client.getTargets();

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:9222/json");
      expect(targets).toEqual(mockTargets);
    });

    it("should use custom port for targets", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      });

      const client = new CDPClient(9333);
      await client.getTargets();

      expect(mockFetch).toHaveBeenCalledWith("http://localhost:9333/json");
    });
  });

  describe("findObsidianTarget", () => {
    it("should find Obsidian target by URL", async () => {
      const mockTargets = [
        {
          id: "123",
          title: "DevTools",
          type: "page",
          url: "devtools://devtools/bundled/devtools_app.html",
          webSocketDebuggerUrl: "ws://localhost:9222/devtools/page/123",
        },
        {
          id: "456",
          title: "notes - Obsidian v1.5.0",
          type: "page",
          url: "app://obsidian.md/index.html",
          webSocketDebuggerUrl: "ws://localhost:9222/devtools/page/456",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockTargets),
      });

      const client = new CDPClient();
      const target = await client.findObsidianTarget();

      expect(target).toEqual(mockTargets[1]);
    });

    it("should find Obsidian target by title", async () => {
      const mockTargets = [
        {
          id: "789",
          title: "My Obsidian Vault",
          type: "page",
          url: "app://custom.app/index.html",
          webSocketDebuggerUrl: "ws://localhost:9222/devtools/page/789",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockTargets),
      });

      const client = new CDPClient();
      const target = await client.findObsidianTarget();

      expect(target).toEqual(mockTargets[0]);
    });

    it("should return null when no Obsidian target found", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      });

      const client = new CDPClient();
      const target = await client.findObsidianTarget();

      expect(target).toBeNull();
    });

    it("should ignore non-page targets", async () => {
      const mockTargets = [
        {
          id: "123",
          title: "Obsidian Worker",
          type: "worker",
          url: "app://obsidian.md/worker.js",
          webSocketDebuggerUrl: "ws://localhost:9222/devtools/page/123",
        },
      ];
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve(mockTargets),
      });

      const client = new CDPClient();
      const target = await client.findObsidianTarget();

      expect(target).toBeNull();
    });
  });

  describe("connect", () => {
    it("should connect with provided WebSocket URL", async () => {
      const client = new CDPClient();
      await client.connect("ws://localhost:9222/devtools/page/123");
      // Connection successful if no error thrown
    });

    it("should throw error when no Obsidian target found", async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve([]),
      });

      const client = new CDPClient();
      await expect(client.connect()).rejects.toThrow("Obsidian not found");
    });

    it("should not reconnect if already connected", async () => {
      const client = new CDPClient();
      await client.connect("ws://localhost:9222/devtools/page/123");
      // Second connect should return immediately
      await client.connect("ws://localhost:9222/devtools/page/123");
    });
  });

  describe("evaluate", () => {
    it("should evaluate JavaScript expression", async () => {
      const client = new CDPClient();
      await client.connect("ws://localhost:9222/devtools/page/123");

      const result = await client.evaluate("1 + 1");
      expect(result).toBe("test result");
    });
  });

  describe("screenshot", () => {
    it("should capture screenshot in PNG format", async () => {
      const client = new CDPClient();
      await client.connect("ws://localhost:9222/devtools/page/123");

      const result = await client.screenshot("png");
      expect(result).toBe("base64screenshotdata");
    });
  });

  describe("console messages", () => {
    it("should return empty array initially", () => {
      const client = new CDPClient();
      const messages = client.getConsoleMessages();
      expect(messages).toEqual([]);
    });

    it("should clear console messages", () => {
      const client = new CDPClient();
      client.clearConsoleMessages();
      const messages = client.getConsoleMessages();
      expect(messages).toEqual([]);
    });
  });

  describe("disconnect", () => {
    it("should disconnect WebSocket", async () => {
      const client = new CDPClient();
      await client.connect("ws://localhost:9222/devtools/page/123");
      client.disconnect();
      // No error means success
    });

    it("should handle disconnect when not connected", () => {
      const client = new CDPClient();
      client.disconnect();
      // No error means success
    });
  });
});
