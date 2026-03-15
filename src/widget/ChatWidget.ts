/**
 * ChatWidget — self-contained chatbot overlay widget.
 *
 * Renders a corner chat UI, communicates with POST /api/v1/chat,
 * persists sessionId in sessionStorage, and supports language selection.
 *
 * Requirements: 6.1, 6.5, 5.8
 */

import type { ChatRequest, ChatResponse, NavigationStep } from "../types/index.js";
import { PageContentExtractor } from "./PageContentExtractor.js";
import { ElementHighlighter } from "./ElementHighlighter.js";

export interface WidgetConfig {
  apiUrl: string;
  apiKey?: string;
  defaultLanguage?: string;
  /** Injected document for testing */
  doc?: Document;
  /** Injected sessionStorage for testing */
  storage?: Storage;
  /** Injected fetch for testing */
  fetchFn?: typeof fetch;
}

const SESSION_STORAGE_KEY = "cgsa_session_id";

export class ChatWidget {
  private sessionId: string | null = null;
  private language: string;
  private container!: HTMLElement;
  private messagesEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private readonly doc: Document;
  private readonly storage: Storage;
  private readonly fetchFn: typeof fetch;
  private readonly extractor: PageContentExtractor;
  private readonly highlighter: ElementHighlighter;

  constructor(private readonly config: WidgetConfig) {
    this.doc = config.doc ?? document;
    this.storage = config.storage ?? sessionStorage;
    this.fetchFn = config.fetchFn ?? fetch.bind(globalThis);
    this.language = config.defaultLanguage ?? "en";
    this.extractor = new PageContentExtractor(this.doc);
    this.highlighter = new ElementHighlighter(this.doc);
  }

  /** Mount the widget into the host page. Req 6.1 */
  mount(target: HTMLElement = this.doc.body): void {
    // Restore session from sessionStorage — Req 6.5
    this.sessionId = this.storage.getItem(SESSION_STORAGE_KEY);

    this.container = this.doc.createElement("div");
    this.container.id = "cgsa-widget";
    this.container.setAttribute("role", "complementary");
    this.container.setAttribute("aria-label", "Government Services Assistant");
    this.container.innerHTML = this.buildHTML();

    target.appendChild(this.container);
    this.bindEvents();
  }

  /** Unmount and clean up */
  unmount(): void {
    this.container?.remove();
  }

  /** Current sessionId (null if no session yet) */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /** Set language explicitly — Req 5.8 */
  setLanguage(code: string): void {
    this.language = code;
    const sel = this.container?.querySelector<HTMLSelectElement>("#cgsa-lang-select");
    if (sel) sel.value = code;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private buildHTML(): string {
    return `
      <div id="cgsa-header">
        <span id="cgsa-title">Govt Services Assistant</span>
        <select id="cgsa-lang-select" aria-label="Select language">
          <option value="en">English</option>
          <option value="hi">हिन्दी</option>
          <option value="ta">தமிழ்</option>
          <option value="te">తెలుగు</option>
          <option value="bn">বাংলা</option>
          <option value="mr">मराठी</option>
          <option value="gu">ગુજરાતી</option>
          <option value="kn">ಕನ್ನಡ</option>
          <option value="ml">മലയാളം</option>
          <option value="pa">ਪੰਜਾਬੀ</option>
        </select>
        <button id="cgsa-close-btn" aria-label="Close assistant">✕</button>
      </div>
      <div id="cgsa-messages" role="log" aria-live="polite" aria-label="Conversation"></div>
      <div id="cgsa-input-row">
        <input id="cgsa-input" type="text" placeholder="Ask about a government service…" aria-label="Your message" />
        <button id="cgsa-send-btn" aria-label="Send message">Send</button>
      </div>
    `;
  }

  private bindEvents(): void {
    this.messagesEl = this.container.querySelector<HTMLElement>("#cgsa-messages")!;
    this.inputEl = this.container.querySelector<HTMLInputElement>("#cgsa-input")!;

    this.container.querySelector("#cgsa-send-btn")!
      .addEventListener("click", () => this.handleSend());

    this.inputEl.addEventListener("keydown", (e: Event) => {
      if ((e as KeyboardEvent).key === "Enter") this.handleSend();
    });

    this.container.querySelector("#cgsa-close-btn")!
      .addEventListener("click", () => this.unmount());

    // Language selector — Req 5.8
    this.container.querySelector<HTMLSelectElement>("#cgsa-lang-select")!
      .addEventListener("change", (e: Event) => {
        this.language = (e.target as HTMLSelectElement).value;
      });
  }

  private async handleSend(): Promise<void> {
    const message = this.inputEl.value.trim();
    if (!message) return;

    this.inputEl.value = "";
    this.appendMessage("citizen", message);

    // Attach page context for navigation/summarization queries
    const pageContext = this.extractor.extract();

    const body: ChatRequest & { languageOverride?: string } = {
      sessionId: this.sessionId,
      message,
      pageContext,
      languageOverride: this.language !== "en" ? this.language : undefined,
    };

    try {
      const res = await this.fetchFn(`${this.config.apiUrl}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { "x-api-key": this.config.apiKey } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as ChatResponse;

      // Persist sessionId — Req 6.5
      if (data.sessionId && data.sessionId !== this.sessionId) {
        this.sessionId = data.sessionId;
        this.storage.setItem(SESSION_STORAGE_KEY, data.sessionId);
      }

      this.renderResponse(data);
    } catch {
      this.appendMessage("assistant", "Unable to reach the server. Please try again.");
    }
  }

  private renderResponse(data: ChatResponse): void {
    if (data.replyType === "navigation" && data.metadata?.navigationSteps) {
      const steps = data.metadata.navigationSteps;
      const lines = steps.map((s: NavigationStep) => `${s.order}. ${s.instruction}`).join("\n");
      this.appendMessage("assistant", lines);

      // Highlight referenced elements — Req 6.3
      if (data.metadata.highlightTargets?.length) {
        this.highlighter.highlight(data.metadata.highlightTargets);
      }
    } else {
      this.appendMessage("assistant", data.reply);
    }
  }

  private appendMessage(role: "citizen" | "assistant", content: string): void {
    const el = this.doc.createElement("div");
    el.className = `cgsa-msg cgsa-msg--${role}`;
    el.setAttribute("role", role === "assistant" ? "status" : "none");
    el.textContent = content;
    this.messagesEl.appendChild(el);
    this.messagesEl.scrollTop = this.messagesEl.scrollHeight;
  }
}
