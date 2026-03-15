import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Session } from "../types/index.js";

// ── Mock ioredis ──────────────────────────────────────────────────────────────

const mockRedisStore = new Map<string, { value: string; expiresAt: number }>();

const mockRedis = {
  _listeners: {} as Record<string, Array<(...args: unknown[]) => void>>,
  on(event: string, cb: (...args: unknown[]) => void) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return this;
  },
  emit(event: string, ...args: unknown[]) {
    (this._listeners[event] ?? []).forEach((cb) => cb(...args));
  },
  async set(key: string, value: string, _ex: string, ttlSeconds: number) {
    mockRedisStore.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return "OK";
  },
  async getex(key: string, _ex: string, ttlSeconds: number) {
    const entry = mockRedisStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      mockRedisStore.delete(key);
      return null;
    }
    // Slide TTL
    entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return entry.value;
  },
  async del(key: string) {
    mockRedisStore.delete(key);
    return 1;
  },
  async quit() {
    return "OK";
  },
};

vi.mock("ioredis", () => {
  return {
    default: vi.fn().mockImplementation(() => mockRedis),
  };
});

// ── Import after mock ─────────────────────────────────────────────────────────

import { SessionManager } from "./SessionManager.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isValidSession(s: Session, language: string): void {
  expect(s.sessionId).toBeTruthy();
  expect(s.language).toBe(language);
  expect(s.conversationHistory).toEqual([]);
  expect(s.pendingEligibilityInput).toBeNull();
  expect(s.createdAt).toBeGreaterThan(0);
  expect(s.lastActiveAt).toBeGreaterThan(0);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("SessionManager — Redis mode", () => {
  let sm: SessionManager;

  beforeEach(() => {
    mockRedisStore.clear();
    sm = new SessionManager("redis://localhost:6379");
  });

  afterEach(async () => {
    await sm.close();
  });

  it("createSession returns a valid session", async () => {
    const session = await sm.createSession("en");
    isValidSession(session, "en");
  });

  it("createSession generates unique session IDs", async () => {
    const a = await sm.createSession("en");
    const b = await sm.createSession("en");
    expect(a.sessionId).not.toBe(b.sessionId);
  });

  it("getSession retrieves an existing session", async () => {
    const created = await sm.createSession("hi");
    const retrieved = await sm.getSession(created.sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.sessionId).toBe(created.sessionId);
    expect(retrieved!.language).toBe("hi");
  });

  it("getSession returns null for unknown session ID", async () => {
    const result = await sm.getSession("non-existent-id");
    expect(result).toBeNull();
  });

  it("updateSession merges patch and bumps lastActiveAt", async () => {
    const session = await sm.createSession("en");
    const before = session.lastActiveAt;

    // Ensure time advances
    await new Promise((r) => setTimeout(r, 5));

    const updated = await sm.updateSession(session.sessionId, {
      language: "ta",
    });

    expect(updated.language).toBe("ta");
    expect(updated.sessionId).toBe(session.sessionId);
    expect(updated.lastActiveAt).toBeGreaterThanOrEqual(before);
  });

  it("updateSession does not allow overwriting sessionId", async () => {
    const session = await sm.createSession("en");
    const updated = await sm.updateSession(session.sessionId, {
      sessionId: "hacked-id",
    } as Partial<Session>);
    expect(updated.sessionId).toBe(session.sessionId);
  });

  it("updateSession throws for non-existent session", async () => {
    await expect(
      sm.updateSession("ghost-id", { language: "fr" })
    ).rejects.toThrow("Session not found");
  });

  it("deleteSession removes the session", async () => {
    const session = await sm.createSession("en");
    await sm.deleteSession(session.sessionId);
    const result = await sm.getSession(session.sessionId);
    expect(result).toBeNull();
  });

  it("deleteSession on non-existent ID does not throw", async () => {
    await expect(sm.deleteSession("ghost-id")).resolves.toBeUndefined();
  });

  it("updateSession stores conversation history", async () => {
    const session = await sm.createSession("en");
    const msg = {
      role: "citizen" as const,
      content: "Hello",
      timestamp: Date.now(),
    };
    const updated = await sm.updateSession(session.sessionId, {
      conversationHistory: [msg],
    });
    expect(updated.conversationHistory).toHaveLength(1);
    expect(updated.conversationHistory[0].content).toBe("Hello");

    const retrieved = await sm.getSession(session.sessionId);
    expect(retrieved!.conversationHistory).toHaveLength(1);
  });
});

describe("SessionManager — TTL expiry behavior", () => {
  it("getSession returns null after TTL expiry (simulated)", async () => {
    mockRedisStore.clear();
    const sm = new SessionManager("redis://localhost:6379");

    const session = await sm.createSession("en");

    // Manually expire the entry in the mock store
    const key = `session:${session.sessionId}`;
    const entry = mockRedisStore.get(key);
    expect(entry).toBeDefined();
    entry!.expiresAt = Date.now() - 1; // already expired

    const result = await sm.getSession(session.sessionId);
    expect(result).toBeNull();

    await sm.close();
  });

  it("no session data survives after explicit delete", async () => {
    mockRedisStore.clear();
    const sm = new SessionManager("redis://localhost:6379");

    const session = await sm.createSession("en");
    await sm.updateSession(session.sessionId, {
      pendingEligibilityInput: { age: 30, annualIncome: 50000 },
    });

    await sm.deleteSession(session.sessionId);

    const result = await sm.getSession(session.sessionId);
    expect(result).toBeNull();

    await sm.close();
  });
});

describe("SessionManager — degraded in-memory mode", () => {
  it("falls back to in-memory when Redis emits an error", async () => {
    mockRedisStore.clear();
    const sm = new SessionManager("redis://localhost:6379");

    // Simulate Redis going down
    mockRedis.emit("error", new Error("ECONNREFUSED"));
    expect(sm.isDegraded).toBe(true);

    // Should still work via in-memory store
    const session = await sm.createSession("en");
    expect(session.sessionId).toBeTruthy();

    const retrieved = await sm.getSession(session.sessionId);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.sessionId).toBe(session.sessionId);

    await sm.close();
  });

  it("in-memory mode supports full CRUD lifecycle", async () => {
    mockRedisStore.clear();
    const sm = new SessionManager("redis://localhost:6379");
    mockRedis.emit("error", new Error("ECONNREFUSED"));

    const session = await sm.createSession("hi");
    const updated = await sm.updateSession(session.sessionId, {
      language: "ta",
    });
    expect(updated.language).toBe("ta");

    await sm.deleteSession(session.sessionId);
    const result = await sm.getSession(session.sessionId);
    expect(result).toBeNull();

    await sm.close();
  });

  it("in-memory mode respects TTL expiry", async () => {
    mockRedisStore.clear();
    const sm = new SessionManager("redis://localhost:6379");
    mockRedis.emit("error", new Error("ECONNREFUSED"));

    const session = await sm.createSession("en");

    // Directly manipulate the internal store via a cast to test expiry
    // We access the private memStore through the class instance
    const anyManager = sm as unknown as {
      memStore: {
        store: Map<string, { session: Session; expiresAt: number }>;
      };
    };
    const entry = anyManager.memStore.store.get(session.sessionId);
    expect(entry).toBeDefined();
    entry!.expiresAt = Date.now() - 1;

    const result = await sm.getSession(session.sessionId);
    expect(result).toBeNull();

    await sm.close();
  });

  it("does not throw when Redis constructor fails", async () => {
    const Redis = (await import("ioredis")).default;
    vi.mocked(Redis).mockImplementationOnce(() => {
      throw new Error("Redis unavailable");
    });

    const sm = new SessionManager("redis://bad-host");
    expect(sm.isDegraded).toBe(true);

    const session = await sm.createSession("en");
    expect(session.sessionId).toBeTruthy();

    await sm.close();
  });
});
