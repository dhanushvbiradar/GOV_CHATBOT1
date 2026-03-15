import { describe, it, expect, vi, beforeEach } from "vitest";
import { OrchestratorService } from "./OrchestratorService.js";
import type { Session, ChatRequest, ChatResponse } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    sessionId: "sess-123",
    language: "en",
    conversationHistory: [],
    pendingEligibilityInput: null,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
    ...overrides,
  };
}

function makeResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    sessionId: "",
    reply: "Here is your answer.",
    replyType: "text",
    ...overrides,
  };
}

// ─── Mock factories ───────────────────────────────────────────────────────────

function makeMocks() {
  const session = makeSession();
  const newSession = makeSession({ sessionId: "sess-new" });

  const sessionManager = {
    createSession: vi.fn().mockResolvedValue(session),
    getSession: vi.fn().mockResolvedValue(session),
    updateSession: vi.fn().mockResolvedValue(session),
    deleteSession: vi.fn().mockResolvedValue(undefined),
  } as any;

  const intentClassifier = {
    classify: vi.fn().mockResolvedValue({ intent: "GOVT_SERVICE_QA", confidence: 0.9 }),
  } as any;

  const queryRouter = {
    route: vi.fn().mockResolvedValue(makeResponse()),
  } as any;

  return { sessionManager, intentClassifier, queryRouter, session, newSession };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("OrchestratorService", () => {
  describe("session handling", () => {
    it("creates a new session when sessionId is null", async () => {
      const { sessionManager, intentClassifier, queryRouter } = makeMocks();
      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

      const request: ChatRequest = { sessionId: null, message: "How do I apply for a passport?" };
      await svc.handleRequest(request);

      expect(sessionManager.getSession).not.toHaveBeenCalled();
      expect(sessionManager.createSession).toHaveBeenCalledWith("en");
    });

    it("loads existing session when valid sessionId is provided", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

      const request: ChatRequest = { sessionId: session.sessionId, message: "What documents do I need?" };
      await svc.handleRequest(request);

      expect(sessionManager.getSession).toHaveBeenCalledWith(session.sessionId);
      expect(sessionManager.createSession).not.toHaveBeenCalled();
    });

    it("creates a new session when getSession returns null (missing session)", async () => {
      const { sessionManager, intentClassifier, queryRouter } = makeMocks();
      sessionManager.getSession.mockResolvedValue(null);
      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

      const request: ChatRequest = { sessionId: "stale-id", message: "Hello" };
      await svc.handleRequest(request);

      expect(sessionManager.getSession).toHaveBeenCalledWith("stale-id");
      expect(sessionManager.createSession).toHaveBeenCalledWith("en");
    });

    it("always sets sessionId on the returned ChatResponse", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

      const request: ChatRequest = { sessionId: null, message: "Hello" };
      const response = await svc.handleRequest(request);

      expect(response.sessionId).toBe(session.sessionId);
    });
  });

  describe("session reset", () => {
    it.each(["reset", "clear", "start over", "new session"])(
      'resets session and returns confirmation for "%s"',
      async (cmd) => {
        const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
        const resetSession = makeSession({ sessionId: "sess-reset" });
        sessionManager.createSession
          .mockResolvedValueOnce(session)       // initial load (null sessionId path)
          .mockResolvedValueOnce(resetSession); // after delete

        const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
        const request: ChatRequest = { sessionId: null, message: cmd };
        const response = await svc.handleRequest(request);

        expect(sessionManager.deleteSession).toHaveBeenCalledWith(session.sessionId);
        expect(response.reply).toBe("Your session has been reset. How can I help you?");
        expect(response.sessionId).toBe(resetSession.sessionId);
        expect(intentClassifier.classify).not.toHaveBeenCalled();
      }
    );

    it("is case-insensitive and trims whitespace for reset commands", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      const resetSession = makeSession({ sessionId: "sess-reset" });
      sessionManager.createSession
        .mockResolvedValueOnce(session)
        .mockResolvedValueOnce(resetSession);

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
      const request: ChatRequest = { sessionId: null, message: "  RESET  " };
      const response = await svc.handleRequest(request);

      expect(response.reply).toBe("Your session has been reset. How can I help you?");
    });
  });

  describe("intent classification and routing", () => {
    it("classifies intent and routes to the correct service", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      const expectedResponse = makeResponse({ reply: "Passport steps: ..." });
      queryRouter.route.mockResolvedValue(expectedResponse);

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
      const request: ChatRequest = { sessionId: session.sessionId, message: "How do I apply for a passport?" };
      const response = await svc.handleRequest(request);

      expect(intentClassifier.classify).toHaveBeenCalledWith(
        request.message,
        session.conversationHistory
      );
      expect(queryRouter.route).toHaveBeenCalledWith(
        "GOVT_SERVICE_QA",
        request.message,
        session.conversationHistory,
        undefined,
        undefined
      );
      expect(response.reply).toBe("Passport steps: ...");
    });
  });

  describe("conversation history", () => {
    it("appends citizen message and assistant reply to conversation history", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      queryRouter.route.mockResolvedValue(makeResponse({ reply: "Here are the steps." }));

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
      const request: ChatRequest = { sessionId: session.sessionId, message: "How do I apply?" };
      await svc.handleRequest(request);

      expect(sessionManager.updateSession).toHaveBeenCalledWith(
        session.sessionId,
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ role: "citizen", content: "How do I apply?" }),
            expect.objectContaining({ role: "assistant", content: "Here are the steps." }),
          ]),
        })
      );
    });
  });

  describe("timeout handling", () => {
    it("returns error response when classify+route exceeds 4.5 seconds", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();

      // Make classify hang forever (never resolves)
      intentClassifier.classify.mockReturnValue(new Promise(() => {}));

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

      vi.useFakeTimers();
      try {
        const responsePromise = svc.handleRequest({ sessionId: session.sessionId, message: "Hello" });
        // Advance past the 4.5s timeout
        await vi.advanceTimersByTimeAsync(4600);
        const response = await responsePromise;

        expect(response.replyType).toBe("error");
        expect(response.reply).toBe("The request took too long. Please try again.");
        expect(response.sessionId).toBe(session.sessionId);
      } finally {
        vi.useRealTimers();
      }
    }, 10000);
  });

  describe("error handling", () => {
    it("returns error response and preserves session history on unhandled exception", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      const existingHistory = [
        { role: "citizen" as const, content: "Previous message", timestamp: Date.now() },
      ];
      const sessionWithHistory = makeSession({ conversationHistory: existingHistory });
      sessionManager.getSession.mockResolvedValue(sessionWithHistory);

      intentClassifier.classify.mockRejectedValue(new Error("LLM unavailable"));

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
      const request: ChatRequest = { sessionId: sessionWithHistory.sessionId, message: "New message" };
      const response = await svc.handleRequest(request);

      expect(response.replyType).toBe("error");
      expect(response.reply).toBe("Something went wrong. Please visit the official portal for assistance.");
      expect(response.sessionId).toBe(sessionWithHistory.sessionId);

      // Session history should be preserved (updateSession called with existing history)
      expect(sessionManager.updateSession).toHaveBeenCalledWith(
        sessionWithHistory.sessionId,
        expect.objectContaining({
          conversationHistory: existingHistory,
        })
      );
    });

    it("returns error response on router failure", async () => {
      const { sessionManager, intentClassifier, queryRouter, session } = makeMocks();
      queryRouter.route.mockRejectedValue(new Error("Service unavailable"));

      const svc = new OrchestratorService(sessionManager, intentClassifier, queryRouter);
      const response = await svc.handleRequest({ sessionId: session.sessionId, message: "Hello" });

      expect(response.replyType).toBe("error");
      expect(response.sessionId).toBe(session.sessionId);
    });
  });
});
