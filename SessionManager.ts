import Redis from "ioredis";
import { randomUUID } from "crypto";
import type { Session } from "../types/index.js";

const TTL_SECONDS = 1800; // 30 minutes

/**
 * In-memory fallback store used when Redis is unreachable (degraded mode).
 * Sessions stored here are process-local and will not survive restarts.
 */
class InMemoryStore {
  private store = new Map<string, { session: Session; expiresAt: number }>();

  set(sessionId: string, session: Session): void {
    this.store.set(sessionId, {
      session,
      expiresAt: Date.now() + TTL_SECONDS * 1000,
    });
  }

  get(sessionId: string): Session | null {
    const entry = this.store.get(sessionId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(sessionId);
      return null;
    }
    // Slide the TTL on read
    entry.expiresAt = Date.now() + TTL_SECONDS * 1000;
    return entry.session;
  }

  delete(sessionId: string): void {
    this.store.delete(sessionId);
  }
}

export class SessionManager {
  private redis: Redis | null = null;
  private degraded = false;
  private memStore = new InMemoryStore();

  constructor(redisUrl?: string) {
    try {
      const url = redisUrl ?? process.env.REDIS_URL ?? "redis://localhost:6379";
      this.redis = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
      });

      this.redis.on("error", () => {
        if (!this.degraded) {
          this.degraded = true;
        }
      });

      this.redis.on("connect", () => {
        this.degraded = false;
      });
    } catch {
      this.degraded = true;
      this.redis = null;
    }
  }

  /** True when operating without Redis (in-memory fallback). */
  get isDegraded(): boolean {
    return this.degraded;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private redisKey(sessionId: string): string {
    return `session:${sessionId}`;
  }

  private async redisSet(sessionId: string, session: Session): Promise<void> {
    if (!this.redis) throw new Error("no redis");
    await this.redis.set(
      this.redisKey(sessionId),
      JSON.stringify(session),
      "EX",
      TTL_SECONDS
    );
  }

  private async redisGet(sessionId: string): Promise<Session | null> {
    if (!this.redis) throw new Error("no redis");
    const raw = await this.redis.getex(this.redisKey(sessionId), "EX", TTL_SECONDS);
    if (!raw) return null;
    return JSON.parse(raw) as Session;
  }

  private async redisDelete(sessionId: string): Promise<void> {
    if (!this.redis) throw new Error("no redis");
    await this.redis.del(this.redisKey(sessionId));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  async createSession(language: string): Promise<Session> {
    const now = Date.now();
    const session: Session = {
      sessionId: randomUUID(),
      language,
      conversationHistory: [],
      pendingEligibilityInput: null,
      createdAt: now,
      lastActiveAt: now,
    };

    if (!this.degraded && this.redis) {
      try {
        await this.redisSet(session.sessionId, session);
        return session;
      } catch {
        this.degraded = true;
      }
    }

    this.memStore.set(session.sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.degraded && this.redis) {
      try {
        return await this.redisGet(sessionId);
      } catch {
        this.degraded = true;
      }
    }

    return this.memStore.get(sessionId);
  }

  async updateSession(
    sessionId: string,
    patch: Partial<Session>
  ): Promise<Session> {
    const existing = await this.getSession(sessionId);
    if (!existing) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const updated: Session = {
      ...existing,
      ...patch,
      sessionId, // never allow overwriting the id
      lastActiveAt: Date.now(),
    };

    if (!this.degraded && this.redis) {
      try {
        await this.redisSet(sessionId, updated);
        return updated;
      } catch {
        this.degraded = true;
      }
    }

    this.memStore.set(sessionId, updated);
    return updated;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.degraded && this.redis) {
      try {
        await this.redisDelete(sessionId);
        return;
      } catch {
        this.degraded = true;
      }
    }

    this.memStore.delete(sessionId);
  }

  /** Gracefully close the Redis connection. */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit().catch(() => {});
    }
  }
}
