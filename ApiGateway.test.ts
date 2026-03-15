import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ApiGateway, RateLimiter } from "./ApiGateway.js";
import type { ChatResponse } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeOrchestrator(response?: Partial<ChatResponse>) {
  return {
    handleRequest: vi.fn().mockResolvedValue({
      sessionId: "sess-1",
      reply: "Here is your answer.",
      replyType: "text",
      ...response,
    }),
  } as any;
}

async function post(
  gateway: ApiGateway,
  port: number,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; body: unknown }> {
  const json = JSON.stringify(body);
  const res = await fetch(`http://localhost:${port}/api/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: json,
  });
  return { status: res.status, body: await res.json() };
}

// Use a unique port per test file to avoid conflicts
const PORT = 14321;
const VALID_KEY = "test-api-key-123";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ApiGateway", () => {
  let gateway: ApiGateway;

  beforeEach(async () => {
    gateway = new ApiGateway(makeOrchestrator(), new Set([VALID_KEY]));
    await gateway.listen(PORT);
  });

  afterEach(async () => {
    await gateway.close();
  });

  describe("routing", () => {
    it("returns 404 for unknown routes", async () => {
      const res = await fetch(`http://localhost:${PORT}/unknown`, { method: "GET" });
      expect(res.status).toBe(404);
    });

    it("returns 404 for GET /api/v1/chat", async () => {
      const res = await fetch(`http://localhost:${PORT}/api/v1/chat`, { method: "GET" });
      expect(res.status).toBe(404);
    });
  });

  describe("authentication", () => {
    it("rejects requests with no credentials (401)", async () => {
      const { status } = await post(gateway, PORT, { message: "hello" });
      expect(status).toBe(401);
    });

    it("rejects requests with invalid API key (401)", async () => {
      const { status } = await post(gateway, PORT, { message: "hello" }, { "x-api-key": "wrong" });
      expect(status).toBe(401);
    });

    it("accepts requests with valid API key", async () => {
      const { status } = await post(gateway, PORT, { message: "hello" }, { "x-api-key": VALID_KEY });
      expect(status).toBe(200);
    });

    it("accepts requests with Bearer token", async () => {
      const { status } = await post(gateway, PORT, { message: "hello" }, { authorization: "Bearer some-jwt-token" });
      expect(status).toBe(200);
    });
  });

  describe("request validation", () => {
    it("returns 400 for missing message field", async () => {
      const { status, body } = await post(gateway, PORT, { sessionId: null }, { "x-api-key": VALID_KEY });
      expect(status).toBe(400);
      expect((body as any).error).toMatch(/message/i);
    });

    it("returns 400 for empty message", async () => {
      const { status } = await post(gateway, PORT, { message: "   " }, { "x-api-key": VALID_KEY });
      expect(status).toBe(400);
    });

    it("returns 400 for malformed JSON", async () => {
      const res = await fetch(`http://localhost:${PORT}/api/v1/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": VALID_KEY },
        body: "not-json",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("successful request", () => {
    it("returns 200 with ChatResponse shape", async () => {
      const { status, body } = await post(
        gateway, PORT,
        { sessionId: null, message: "How do I apply for a passport?" },
        { "x-api-key": VALID_KEY }
      );
      expect(status).toBe(200);
      expect((body as any).sessionId).toBe("sess-1");
      expect((body as any).reply).toBe("Here is your answer.");
      expect((body as any).replyType).toBe("text");
    });

    it("passes the request body to the orchestrator", async () => {
      const orchestrator = makeOrchestrator();
      const gw = new ApiGateway(orchestrator, new Set([VALID_KEY]));
      await gw.listen(PORT + 1);
      try {
        await post(gw, PORT + 1, { sessionId: "s1", message: "Hello" }, { "x-api-key": VALID_KEY });
        expect(orchestrator.handleRequest).toHaveBeenCalledWith(
          expect.objectContaining({ sessionId: "s1", message: "Hello" })
        );
      } finally {
        await gw.close();
      }
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when rate limit is exceeded", async () => {
      const limiter = new RateLimiter(60_000, 2); // max 2 per window
      const gw = new ApiGateway(makeOrchestrator(), new Set([VALID_KEY]), limiter);
      await gw.listen(PORT + 2);
      try {
        await post(gw, PORT + 2, { message: "hi" }, { "x-api-key": VALID_KEY });
        await post(gw, PORT + 2, { message: "hi" }, { "x-api-key": VALID_KEY });
        const { status, body } = await post(gw, PORT + 2, { message: "hi" }, { "x-api-key": VALID_KEY });
        expect(status).toBe(429);
        expect((body as any).error).toMatch(/too many/i);
      } finally {
        await gw.close();
      }
    });
  });
});

describe("RateLimiter", () => {
  it("allows requests within the limit", () => {
    const limiter = new RateLimiter(60_000, 3);
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key1")).toBe(true);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = new RateLimiter(60_000, 2);
    limiter.check("key1");
    limiter.check("key1");
    expect(limiter.check("key1")).toBe(false);
  });

  it("resets after the window expires", () => {
    vi.useFakeTimers();
    const limiter = new RateLimiter(1000, 1);
    limiter.check("key1");
    expect(limiter.check("key1")).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(limiter.check("key1")).toBe(true);
    vi.useRealTimers();
  });

  it("tracks different keys independently", () => {
    const limiter = new RateLimiter(60_000, 1);
    expect(limiter.check("key1")).toBe(true);
    expect(limiter.check("key2")).toBe(true);
    expect(limiter.check("key1")).toBe(false);
    expect(limiter.check("key2")).toBe(false);
  });
});
