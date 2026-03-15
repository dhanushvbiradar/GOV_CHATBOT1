/**
 * Entry point — wires all services together and starts the API server.
 *
 * Usage:
 *   npm run dev        # ts-node / tsx watch
 *   npm run build && node dist/index.js
 *
 * Environment variables:
 *   PORT          HTTP port (default: 3000)
 *   REDIS_URL     Redis connection URL (default: redis://localhost:6379)
 *   API_KEYS      Comma-separated list of valid API keys (default: "dev-key")
 *   LLM_BASE_URL  LLM provider base URL (optional, uses stub if not set)
 */

import { SessionManager } from "./session/SessionManager.js";
import { KnowledgeBaseRepository } from "./kb/KnowledgeBaseRepository.js";
import { DocumentRegistryRepository } from "./kb/DocumentRegistryRepository.js";
import { QAService } from "./qa/QAService.js";
import { EligibilityEngine } from "./eligibility/EligibilityEngine.js";
import { DocumentRegistryService } from "./documents/DocumentRegistryService.js";
import { NavigationService } from "./navigation/NavigationService.js";
import { PageSummarizer } from "./summarizer/PageSummarizer.js";
import { IntentClassifier } from "./intent/IntentClassifier.js";
import { QueryRouter } from "./intent/QueryRouter.js";
import { OrchestratorService } from "./orchestrator/OrchestratorService.js";
import { ApiGateway } from "./api/ApiGateway.js";
import type { LLMClient } from "./intent/IntentClassifier.js";

// ─── Stub LLM client (replace with real provider integration) ─────────────────

const stubLLM: LLMClient = {
  async complete(prompt: string): Promise<string> {
    // Minimal stub: classify based on keywords, summarize with placeholder
    if (prompt.includes("intent classifier") || prompt.includes("Classify")) {
      if (/passport|driving|aadhaar|license/i.test(prompt))
        return JSON.stringify({ intent: "GOVT_SERVICE_QA", confidence: 0.9 });
      if (/eligible|scheme|benefit/i.test(prompt))
        return JSON.stringify({ intent: "ELIGIBILITY_DISCOVERY", confidence: 0.85 });
      if (/document|certificate|proof/i.test(prompt))
        return JSON.stringify({ intent: "DOCUMENT_REQUIREMENTS", confidence: 0.85 });
      if (/navigate|find|where|button|click/i.test(prompt))
        return JSON.stringify({ intent: "NAVIGATION_GUIDANCE", confidence: 0.8 });
      if (/summarize|summary|explain this page/i.test(prompt))
        return JSON.stringify({ intent: "PAGE_SUMMARIZATION", confidence: 0.8 });
      return JSON.stringify({ intent: "UNKNOWN", confidence: 0.3 });
    }
    // Fallback for Q&A / summarization prompts
    return "I can help you with that. Please visit the official portal for detailed information.";
  },
};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const REDIS_URL = process.env.REDIS_URL;
const API_KEYS = new Set((process.env.API_KEYS ?? "dev-key").split(",").map((k) => k.trim()));

// Data layer
const kbRepo = new KnowledgeBaseRepository();
const docRepo = new DocumentRegistryRepository();

// Core services
const qaService = new QAService(kbRepo, stubLLM);
const eligibilityEngine = new EligibilityEngine(kbRepo);
const documentService = new DocumentRegistryService(docRepo);
const navigationService = new NavigationService(kbRepo);
const pageSummarizer = new PageSummarizer(stubLLM);

// Orchestration
const sessionManager = new SessionManager(REDIS_URL);
const intentClassifier = new IntentClassifier(stubLLM);
const queryRouter = new QueryRouter(qaService, eligibilityEngine, documentService, navigationService, pageSummarizer);
const orchestrator = new OrchestratorService(sessionManager, intentClassifier, queryRouter);

// API Gateway
const gateway = new ApiGateway(orchestrator, API_KEYS);

gateway.listen(PORT).then(() => {
  console.log(`[server] Citizen Govt Services Assistant running on http://localhost:${PORT}`);
  console.log(`[server] POST /api/v1/chat  (x-api-key: ${[...API_KEYS][0]})`);
  console.log(`[server] Redis: ${REDIS_URL ?? "redis://localhost:6379 (default)"}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n[server] Shutting down...");
  await gateway.close();
  await sessionManager.close();
  process.exit(0);
});
