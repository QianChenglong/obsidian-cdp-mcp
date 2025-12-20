import WebSocket from "ws";

interface CDPMessage {
  id: number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

interface CDPTarget {
  id: string;
  title: string;
  type: string;
  url: string;
  webSocketDebuggerUrl: string;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
}

/**
 * Ring buffer for efficient console message storage
 * Avoids O(n) shift operations when buffer is full
 */
class ConsoleMessageBuffer {
  private buffer: (ConsoleMessage | null)[];
  private head = 0; // Next write position
  private size = 0;
  private readonly capacity: number;

  constructor(capacity = 1000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  push(message: ConsoleMessage): void {
    this.buffer[this.head] = message;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAll(): ConsoleMessage[] {
    if (this.size === 0) return [];

    const result: ConsoleMessage[] = [];
    const start = this.size < this.capacity ? 0 : this.head;

    for (let i = 0; i < this.size; i++) {
      const idx = (start + i) % this.capacity;
      const msg = this.buffer[idx];
      if (msg) result.push(msg);
    }

    return result;
  }

  filter(predicate: (msg: ConsoleMessage) => boolean): ConsoleMessage[] {
    return this.getAll().filter(predicate);
  }

  clear(): void {
    this.buffer = new Array(this.capacity).fill(null);
    this.head = 0;
    this.size = 0;
  }

  get length(): number {
    return this.size;
  }
}

export class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests = new Map<number, PendingRequest>();
  private consoleMessages: ConsoleMessageBuffer;
  private debugPort: number;
  private connectPromise: Promise<void> | null = null;

  // Configurable timeouts
  private connectTimeout: number;
  private requestTimeout: number;
  private fetchTimeout: number;

  // Cache for injected helper functions
  private helpersInjected = false;

  constructor(
    debugPort = 9222,
    options: {
      connectTimeout?: number;
      requestTimeout?: number;
      fetchTimeout?: number;
      consoleBufferSize?: number;
    } = {}
  ) {
    this.debugPort = debugPort;
    this.connectTimeout = options.connectTimeout ?? 10000; // 10s for connection
    this.requestTimeout = options.requestTimeout ?? 30000; // 30s for requests
    this.fetchTimeout = options.fetchTimeout ?? 5000; // 5s for HTTP fetch
    this.consoleMessages = new ConsoleMessageBuffer(options.consoleBufferSize ?? 1000);
  }

  async getTargets(): Promise<CDPTarget[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);

    try {
      const response = await fetch(`http://localhost:${this.debugPort}/json`, {
        signal: controller.signal,
      });
      return response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `Connection to Obsidian debug port ${this.debugPort} timed out after ${this.fetchTimeout}ms`
        );
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async findObsidianTarget(): Promise<CDPTarget | null> {
    const targets = await this.getTargets();
    return (
      targets.find(
        (t) =>
          t.type === "page" &&
          (t.url.includes("obsidian") || t.title.toLowerCase().includes("obsidian"))
      ) || null
    );
  }

  async connect(wsUrl?: string): Promise<void> {
    // If already connected, return immediately
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // If connection is in progress, wait for it
    if (this.connectPromise) {
      return this.connectPromise;
    }

    // If WebSocket exists but is in CONNECTING state, wait for it
    if (this.ws?.readyState === WebSocket.CONNECTING) {
      this.connectPromise = new Promise((resolve, reject) => {
        this.ws!.once("open", () => {
          this.connectPromise = null;
          resolve();
        });
        this.ws!.once("error", (err) => {
          this.connectPromise = null;
          reject(err);
        });
      });
      return this.connectPromise;
    }

    // Start new connection
    this.connectPromise = this.doConnect(wsUrl);
    try {
      await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }

  private async doConnect(wsUrl?: string): Promise<void> {
    let targetUrl = wsUrl;
    if (!targetUrl) {
      const target = await this.findObsidianTarget();
      if (!target) {
        throw new Error(
          "Obsidian not found. Make sure Obsidian is running with --remote-debugging-port"
        );
      }
      targetUrl = target.webSocketDebuggerUrl;
    }

    return new Promise((resolve, reject) => {
      // Connection timeout
      const connectTimer = setTimeout(() => {
        if (this.ws) {
          this.ws.terminate();
          this.ws = null;
        }
        reject(
          new Error(
            `WebSocket connection to Obsidian timed out after ${this.connectTimeout}ms`
          )
        );
      }, this.connectTimeout);

      this.ws = new WebSocket(targetUrl!, { maxPayload: 100 * 1024 * 1024 });

      this.ws.on("open", async () => {
        clearTimeout(connectTimer);
        try {
          // Enable Runtime to capture console messages
          await this.send("Runtime.enable");
          // Reset helpers flag on new connection
          this.helpersInjected = false;
          resolve();
        } catch (error) {
          // Runtime.enable failed, but connection is still usable
          console.error("Failed to enable Runtime:", error);
          resolve();
        }
      });

      this.ws.on("message", (data) => {
        // Use Buffer directly when possible to avoid extra toString() call
        const raw = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
        const message: CDPMessage = JSON.parse(raw);

        // Handle console messages
        if (message.method === "Runtime.consoleAPICalled") {
          const params = message.params as {
            type: string;
            args: Array<{ value?: string; description?: string }>;
            timestamp: number;
          };
          this.consoleMessages.push({
            type: params.type,
            text: params.args.map((a) => a.value ?? a.description ?? "").join(" "),
            timestamp: params.timestamp,
          });
        }

        // Handle responses
        if (message.id !== undefined) {
          const pending = this.pendingRequests.get(message.id);
          if (pending) {
            clearTimeout(pending.timer); // Clear the timeout timer
            this.pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
        }
      });

      this.ws.on("error", (error) => {
        clearTimeout(connectTimer);
        reject(error);
      });

      this.ws.on("close", () => {
        // Reject all pending requests when connection closes
        for (const [id, pending] of this.pendingRequests) {
          clearTimeout(pending.timer);
          pending.reject(new Error("WebSocket connection closed"));
          this.pendingRequests.delete(id);
        }
        this.ws = null;
        this.helpersInjected = false;
      });
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      // Set up timeout with cleanup
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out after ${this.requestTimeout}ms`));
        }
      }, this.requestTimeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      const message = JSON.stringify({ id, method, params });
      this.ws!.send(message);
    });
  }

  /**
   * Inject helper functions into Obsidian's context once per connection.
   * This avoids sending the same code repeatedly.
   */
  async ensureHelpers(): Promise<void> {
    if (this.helpersInjected) return;

    await this.evaluate(
      `
      if (!window.__mcpHelpers) {
        window.__mcpHelpers = {
          // Efficient file search with early termination
          searchFiles: (query, limit) => {
            const q = query.toLowerCase();
            const results = [];
            const files = app.vault.getFiles();
            for (const f of files) {
              if (f.path.toLowerCase().includes(q)) {
                results.push({ path: f.path, name: f.name, extension: f.extension });
                if (results.length >= limit) break;
              }
            }
            return results;
          },
          
          // Get file info safely
          getFileInfo: (path) => {
            const file = app.vault.getAbstractFileByPath(path);
            if (!file) return null;
            return {
              path: file.path,
              name: file.name,
              basename: file.basename,
              extension: file.extension,
              stat: file.stat
            };
          }
        };
      }
      true
    `,
      false
    );

    this.helpersInjected = true;
  }

  async evaluate<T>(expression: string, awaitPromise = false): Promise<T> {
    const result = (await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise,
    })) as {
      result: { value: T; type: string; description?: string };
      exceptionDetails?: { exception: { description: string } };
    };

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception.description);
    }

    return result.result.value;
  }

  async screenshot(
    format: "png" | "jpeg" | "webp" = "png",
    quality?: number
  ): Promise<string> {
    const result = (await this.send("Page.captureScreenshot", {
      format,
      quality,
    })) as { data: string };
    return result.data;
  }

  getConsoleMessages(since?: number): ConsoleMessage[] {
    if (since) {
      return this.consoleMessages.filter((m) => m.timestamp >= since);
    }
    return this.consoleMessages.getAll();
  }

  clearConsoleMessages(): void {
    this.consoleMessages.clear();
  }

  disconnect(): void {
    if (this.ws) {
      // Clear all pending requests
      for (const [id, pending] of this.pendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("Client disconnected"));
        this.pendingRequests.delete(id);
      }
      this.ws.close();
      this.ws = null;
    }
    this.connectPromise = null;
    this.helpersInjected = false;
  }

  /**
   * Check if the client is currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
