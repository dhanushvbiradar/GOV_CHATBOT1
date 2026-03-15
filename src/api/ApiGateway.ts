import { createServer, IncomingMessage, ServerResponse } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";
import type { ChatRequest, ChatResponse } from "../types/index.js";
import type { OrchestratorService } from "../orchestrator/OrchestratorService.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const DEFAULT_PORT = 3000;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 60;           // requests per window per key

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "..", "public");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css":  "text/css",
  ".js":   "application/javascript",
  ".png":  "image/png",
  ".ico":  "image/x-icon",
  ".svg":  "image/svg+xml",
};

// ─── Rate limiter ─────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

export class RateLimiter {
  private readonly store = new Map<string, RateLimitEntry>();

  constructor(
    private readonly windowMs = RATE_LIMIT_WINDOW_MS,
    private readonly max = RATE_LIMIT_MAX
  ) {}

  /** Returns true if the request is allowed, false if rate-limited. */
  check(key: string): boolean {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.store.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= this.max) return false;

    entry.count++;
    return true;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(json),
  });
  res.end(json);
}

function getClientKey(req: IncomingMessage): string {
  // Use API key header if present, otherwise fall back to IP
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && apiKey.length > 0) return `key:${apiKey}`;
  const ip = req.socket.remoteAddress ?? "unknown";
  return `ip:${ip}`;
}

// ─── Auth middleware ──────────────────────────────────────────────────────────

/**
 * Validates the request carries a known API key or a valid Bearer JWT stub.
 * In production replace with real JWT verification.
 */
function authenticate(req: IncomingMessage, validApiKeys: Set<string>): boolean {
  // API key auth
  const apiKey = req.headers["x-api-key"];
  if (typeof apiKey === "string" && validApiKeys.has(apiKey)) return true;

  // Bearer token auth (stub — accepts any non-empty token for now)
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith("Bearer ") && auth.length > 7) return true;

  return false;
}

// ─── ApiGateway ───────────────────────────────────────────────────────────────

export class ApiGateway {
  private readonly server = createServer(this.handleHttp.bind(this));
  private readonly rateLimiter: RateLimiter;

  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly validApiKeys: Set<string> = new Set(),
    rateLimiter?: RateLimiter
  ) {
    this.rateLimiter = rateLimiter ?? new RateLimiter();
  }

  private async handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Serve API
    if (req.method === "POST" && req.url === "/api/v1/chat") {
      return this.handleChat(req, res);
    }

    // Serve static UI files
    if (req.method === "GET") {
      const urlPath = req.url === "/" ? "/index.html" : (req.url ?? "/index.html");
      const filePath = join(PUBLIC_DIR, urlPath.split("?")[0]);
      if (existsSync(filePath)) {
        const ext = extname(filePath);
        const mime = MIME[ext] ?? "application/octet-stream";
        const content = readFileSync(filePath);
        res.writeHead(200, { "Content-Type": mime });
        res.end(content);
        return;
      }
      // SPA fallback
      const index = join(PUBLIC_DIR, "index.html");
      if (existsSync(index)) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(index));
        return;
      }
    }

    send(res, 404, { error: "Not found" });
  }

  private async handleChat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Auth
    if (!authenticate(req, this.validApiKeys)) {
      send(res, 401, { error: "Unauthorized" });
      return;
    }

    // Rate limiting
    const clientKey = getClientKey(req);
    if (!this.rateLimiter.check(clientKey)) {
      send(res, 429, { error: "Too many requests. Please slow down." });
      return;
    }

    // Parse body
    let chatRequest: ChatRequest;
    try {
      const raw = await readBody(req);
      chatRequest = JSON.parse(raw) as ChatRequest;
      if (typeof chatRequest.message !== "string" || chatRequest.message.trim() === "") {
        throw new Error("invalid");
      }
    } catch {
      send(res, 400, { error: "Invalid request body. 'message' is required." });
      return;
    }

    // Dispatch to orchestrator
    try {
      const response: ChatResponse = await this.orchestrator.handleRequest(chatRequest);
      send(res, 200, response);
    } catch {
      send(res, 500, { error: "Internal server error" });
    }
  }

  listen(port = DEFAULT_PORT): Promise<void> {
    return new Promise((resolve) => this.server.listen(port, resolve));
  }

  close(): Promise<void> {
    return new Promise((resolve, reject) =>
      this.server.close((err) => (err ? reject(err) : resolve()))
    );
  }
}
