/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { ElementHighlighter } from "./ElementHighlighter.js";

describe("ElementHighlighter — Req 6.3", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("highlights elements matching a CSS selector", () => {
    document.body.innerHTML = `<button id="apply-btn">Apply Online</button>`;
    const hl = new ElementHighlighter(document);
    hl.highlight(["#apply-btn"]);
    const btn = document.getElementById("apply-btn")!;
    expect(btn.classList.contains("cgsa-highlight")).toBe(true);
  });

  it("highlights elements by text content when selector fails", () => {
    document.body.innerHTML = `<button>Submit Application</button>`;
    const hl = new ElementHighlighter(document);
    hl.highlight(["Submit Application"]);
    const btn = document.querySelector("button")!;
    expect(btn.classList.contains("cgsa-highlight")).toBe(true);
  });

  it("highlights elements by aria-label text", () => {
    document.body.innerHTML = `<button aria-label="Upload Document">📎</button>`;
    const hl = new ElementHighlighter(document);
    hl.highlight(["Upload Document"]);
    const btn = document.querySelector("button")!;
    expect(btn.classList.contains("cgsa-highlight")).toBe(true);
  });

  it("clears all highlights", () => {
    document.body.innerHTML = `<button id="btn1">One</button><button id="btn2">Two</button>`;
    const hl = new ElementHighlighter(document);
    hl.highlight(["#btn1", "#btn2"]);
    hl.clear();
    document.querySelectorAll("button").forEach((btn) => {
      expect(btn.classList.contains("cgsa-highlight")).toBe(false);
    });
  });

  it("handles invalid CSS selector gracefully (falls back to text search)", () => {
    document.body.innerHTML = `<a href="#">Pay Fees</a>`;
    const hl = new ElementHighlighter(document);
    // "Pay Fees" is not a valid CSS selector but should match by text
    expect(() => hl.highlight(["Pay Fees"])).not.toThrow();
    const link = document.querySelector("a")!;
    expect(link.classList.contains("cgsa-highlight")).toBe(true);
  });

  it("does nothing when no elements match", () => {
    document.body.innerHTML = `<p>No buttons here</p>`;
    const hl = new ElementHighlighter(document);
    expect(() => hl.highlight(["#nonexistent"])).not.toThrow();
  });
});
