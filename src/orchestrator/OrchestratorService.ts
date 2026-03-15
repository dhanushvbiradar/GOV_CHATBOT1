import type { ChatRequest, ChatResponse, Message } from "../types/index.js";
import { SessionManager } from "../session/SessionManager.js";
import { IntentClassifier } from "../intent/IntentClassifier.js";
import { QueryRouter } from "../intent/QueryRouter.js";
import { LanguageService } from "../language/LanguageService.js";

const TIMEOUT_MS = 4500;
const RESET_PATTERN = /^(reset|clear|start over|new session)$/;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export class OrchestratorService {
  private readonly languageService: LanguageService;

  constructor(
    private readonly sessionManager: SessionManager,
    private readonly intentClassifier: IntentClassifier,
    private readonly queryRouter: QueryRouter,
    languageService?: LanguageService
  ) {
    this.languageService = languageService ?? new LanguageService();
  }

  async handleRequest(request: ChatRequest): Promise<ChatResponse> {
    // 1. Load or create session
    let session = null;

    try {
      if (request.sessionId != null) {
        session = await this.sessionManager.getSession(request.sessionId);
      }
      if (!session) {
        session = await this.sessionManager.createSession("en");
      }
    } catch {
      // Session store unavailable — create in-memory session (degraded mode)
      session = await this.sessionManager.createSession("en");
    }

    // 2. Resolve language — Req 5.1, 5.2, 5.3, 5.5, 5.8
    const { language, unsupported } = this.languageService.resolve(
      request.message,
      session.language,
      (request as ChatRequest & { languageOverride?: string }).languageOverride
    );

    if (unsupported) {
      const override = (request as ChatRequest & { languageOverride?: string }).languageOverride!;
      return {
        sessionId: session.sessionId,
        reply: this.languageService.buildUnsupportedLanguageMessage(override),
        replyType: "text",
      };
    }

    // Persist language preference if it changed — Req 5.2, 5.5
    if (language !== session.language) {
      try {
        session = await this.sessionManager.updateSession(session.sessionId, { language });
      } catch {
        session = { ...session, language };
      }
    }

    // 3. Check for explicit session reset
    const trimmedMessage = request.message.trim().toLowerCase();
    if (RESET_PATTERN.test(trimmedMessage)) {
      try {
        await this.sessionManager.deleteSession(session.sessionId);
      } catch {
        // ignore errors during delete in degraded mode
      }
      const newSession = await this.sessionManager.createSession(session.language);
      return {
        sessionId: newSession.sessionId,
        reply: "Your session has been reset. How can I help you?",
        replyType: "text",
      };
    }

    // 3 & 4. Classify intent and route — with 4.5s timeout
    let response: ChatResponse;
    try {
      response = await withTimeout(
        (async () => {
          const classification = await this.intentClassifier.classify(
            request.message,
            session!.conversationHistory
          );
          return this.queryRouter.route(
            classification.intent,
            request.message,
            session!.conversationHistory,
            request.pageContext,
            session!.pendingEligibilityInput ?? undefined
          );
        })(),
        TIMEOUT_MS
      );
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === "timeout";

      if (isTimeout) {
        return {
          sessionId: session.sessionId,
          reply: "The request took too long. Please try again.",
          replyType: "error",
        };
      }

      // LLM failure or unhandled exception
      // Log without PII — do not log message content
      console.error("[OrchestratorService] Error handling request:", {
        sessionId: session.sessionId,
        errorMessage: err instanceof Error ? err.message : "unknown error",
      });

      // Preserve session history — persist what we have
      try {
        await this.sessionManager.updateSession(session.sessionId, {
          conversationHistory: session.conversationHistory,
        });
      } catch {
        // ignore persistence failure in degraded mode
      }

      return {
        sessionId: session.sessionId,
        reply: "Something went wrong. Please visit the official portal for assistance.",
        replyType: "error",
      };
    }

    // 6. Append citizen message and assistant reply to conversation history
    const now = Date.now();
    const citizenMessage: Message = {
      role: "citizen",
      content: request.message,
      timestamp: now,
    };
    const assistantMessage: Message = {
      role: "assistant",
      content: response.reply,
      timestamp: now,
    };

    const updatedHistory = [
      ...session.conversationHistory,
      citizenMessage,
      assistantMessage,
    ];

    // 7. Persist updated session
    try {
      await this.sessionManager.updateSession(session.sessionId, {
        conversationHistory: updatedHistory,
      });
    } catch {
      // Degraded mode — continue without persisting
    }

    // 8. Set sessionId on response
    response.sessionId = session.sessionId;

    return response;
  }
}
