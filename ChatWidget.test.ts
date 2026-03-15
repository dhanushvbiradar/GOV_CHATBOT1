/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatWidget } from "./ChatWidget.js";
import type { ChatResponse } from "../types/index.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (i: number) => [...store.keys()][i] ?? null,
  } as Storage;
}

function makeFetch(response: Partial<ChatResponse>) {
  return vi.fn().mockResolvedValue({
    json: async () => ({ sessionId: "sess-abc", reply: "Hello!", replyType: "text", ...response }),
  });
}

function makeWidget(fetchFn = makeFetch({}), storage = makeStorage()) {
  return new ChatWidget({
    apiUrl: "http://localhost:3000",
    apiKey: "test-key",
    doc: document,
    storage,
    fetchFn,
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("ChatWidget", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("mount / unmount", () => {
    it("mounts the widget into the DOM", () => {
      const widget = makeWidget();
      widget.mount();
      expect(document.getElementById("cgsa-widget")).not.toBeNull();
    });

    it("unmounts and removes the widget from the DOM", () => {
      const widget = makeWidget();
      widget.mount();
      widget.unmount();
      expect(document.getElementById("cgsa-widget")).toBeNull();
    });

    it("renders language selector with options", () => {
      const widget = makeWidget();
      widget.mount();
      const sel = document.getElementById("cgsa-lang-select") as HTMLSelectElement;
      expect(sel).not.toBeNull();
      expect(sel.options.length).toBeGreaterThan(1);
    });
  });

  describe("session persistence — Req 6.5", () => {
    it("persists sessionId to sessionStorage after first response", async () => {
      const storage = makeStorage();
      const widget = makeWidget(makeFetch({ sessionId: "sess-xyz" }), storage);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      const btn = document.getElementById("cgsa-send-btn") as HTMLButtonElement;
      input.value = "How do I apply for a passport?";
      btn.click();

      await vi.waitFor(() => expect(storage.getItem("cgsa_session_id")).toBe("sess-xyz"));
    });

    it("restores sessionId from sessionStorage on mount — Req 6.5", () => {
      const storage = makeStorage();
      storage.setItem("cgsa_session_id", "existing-sess");

      const widget = makeWidget(makeFetch({}), storage);
      widget.mount();

      expect(widget.getSessionId()).toBe("existing-sess");
    });

    it("sends restored sessionId in subsequent requests", async () => {
      const storage = makeStorage();
      storage.setItem("cgsa_session_id", "restored-sess");
      const fetchFn = makeFetch({ sessionId: "restored-sess" });

      const widget = makeWidget(fetchFn, storage);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "Hello";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalled());
      const body = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(body.sessionId).toBe("restored-sess");
    });
  });

  describe("language selection — Req 5.8", () => {
    it("setLanguage updates the selector value", () => {
      const widget = makeWidget();
      widget.mount();
      widget.setLanguage("hi");
      const sel = document.getElementById("cgsa-lang-select") as HTMLSelectElement;
      expect(sel.value).toBe("hi");
    });

    it("sends languageOverride when non-English language selected", async () => {
      const fetchFn = makeFetch({});
      const widget = makeWidget(fetchFn);
      widget.mount();
      widget.setLanguage("ta");

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "Help me";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalled());
      const body = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(body.languageOverride).toBe("ta");
    });

    it("does not send languageOverride for English (default)", async () => {
      const fetchFn = makeFetch({});
      const widget = makeWidget(fetchFn);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "Help me";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalled());
      const body = JSON.parse(fetchFn.mock.calls[0][1].body as string);
      expect(body.languageOverride).toBeUndefined();
    });
  });

  describe("message rendering", () => {
    it("appends citizen and assistant messages to the conversation", async () => {
      const fetchFn = makeFetch({ reply: "Here are the steps.", replyType: "text" });
      const widget = makeWidget(fetchFn);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "How do I apply?";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => {
        const msgs = document.querySelectorAll(".cgsa-msg");
        expect(msgs.length).toBe(2);
      });

      const msgs = document.querySelectorAll(".cgsa-msg");
      expect(msgs[0].textContent).toBe("How do I apply?");
      expect(msgs[1].textContent).toBe("Here are the steps.");
    });

    it("renders navigation steps as numbered list", async () => {
      const fetchFn = makeFetch({
        reply: "Follow these steps",
        replyType: "navigation",
        metadata: {
          navigationSteps: [
            { order: 1, instruction: "Click Apply Online" },
            { order: 2, instruction: "Fill in your details" },
          ],
        },
      });
      const widget = makeWidget(fetchFn);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "How do I navigate?";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => {
        const msgs = document.querySelectorAll(".cgsa-msg--assistant");
        expect(msgs.length).toBe(1);
      });

      const reply = document.querySelector(".cgsa-msg--assistant")!.textContent!;
      expect(reply).toContain("1. Click Apply Online");
      expect(reply).toContain("2. Fill in your details");
    });

    it("shows error message on network failure", async () => {
      const fetchFn = vi.fn().mockRejectedValue(new Error("Network error"));
      const widget = makeWidget(fetchFn);
      widget.mount();

      const input = document.getElementById("cgsa-input") as HTMLInputElement;
      input.value = "Hello";
      document.getElementById("cgsa-send-btn")!.click();

      await vi.waitFor(() => {
        const msgs = document.querySelectorAll(".cgsa-msg--assistant");
        expect(msgs.length).toBe(1);
      });

      expect(document.querySelector(".cgsa-msg--assistant")!.textContent).toContain("Unable to reach");
    });
  });
});
