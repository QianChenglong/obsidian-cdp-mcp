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

export class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private consoleMessages: Array<{
    type: string;
    text: string;
    timestamp: number;
  }> = [];
  private debugPort: number;

  constructor(debugPort = 9222) {
    this.debugPort = debugPort;
  }

  async getTargets(): Promise<CDPTarget[]> {
    const response = await fetch(`http://localhost:${this.debugPort}/json`);
    return response.json();
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
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

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
      this.ws = new WebSocket(targetUrl!, { maxPayload: 100 * 1024 * 1024 });

      this.ws.on("open", async () => {
        // Enable Runtime to capture console messages
        await this.send("Runtime.enable");
        resolve();
      });

      this.ws.on("message", (data) => {
        const message: CDPMessage = JSON.parse(data.toString());

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
          // Keep only last 1000 messages
          if (this.consoleMessages.length > 1000) {
            this.consoleMessages.shift();
          }
        }

        // Handle responses
        if (message.id !== undefined) {
          const pending = this.pendingRequests.get(message.id);
          if (pending) {
            this.pendingRequests.delete(message.id);
            if (message.error) {
              pending.reject(new Error(message.error.message));
            } else {
              pending.resolve(message.result);
            }
          }
        }
      });

      this.ws.on("error", reject);
      this.ws.on("close", () => {
        this.ws = null;
      });
    });
  }

  async send(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }

    const id = ++this.messageId;
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify({ id, method, params });
      this.ws!.send(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request ${method} timed out`));
        }
      }, 30000);
    });
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

  getConsoleMessages(since?: number): typeof this.consoleMessages {
    if (since) {
      return this.consoleMessages.filter((m) => m.timestamp >= since);
    }
    return [...this.consoleMessages];
  }

  clearConsoleMessages(): void {
    this.consoleMessages = [];
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
