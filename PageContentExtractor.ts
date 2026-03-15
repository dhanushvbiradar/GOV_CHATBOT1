/**
 * PageContentExtractor — extracts visible text and form field labels from the DOM.
 *
 * Requirements: 6.2, 7.1
 */

import type { PageContext } from "../types/index.js";

export class PageContentExtractor {
  constructor(private readonly doc: Document) {}

  /**
   * Extract visible text and form field labels from the current page.
   * Returns a PageContext suitable for navigation guidance and page summarization.
   */
  extract(): PageContext {
    const url = this.doc.location?.href ?? "";
    const visibleText = this.extractVisibleText();
    const formFields = this.extractFormFields();

    return { url, visibleText, formFields };
  }

  private extractVisibleText(): string {
    const body = this.doc.body;
    if (!body) return "";

    // Walk text nodes, skip hidden elements and script/style
    const walker = this.doc.createTreeWalker(
      body,
      // NodeFilter.SHOW_TEXT = 4
      4,
      {
        acceptNode: (node: Node) => {
          const parent = node.parentElement;
          if (!parent) return 2; // FILTER_REJECT
          const tag = parent.tagName.toLowerCase();
          if (tag === "script" || tag === "style" || tag === "noscript") return 2;
          const style = this.doc.defaultView?.getComputedStyle(parent);
          if (style?.display === "none" || style?.visibility === "hidden") return 2;
          return 1; // FILTER_ACCEPT
        },
      }
    );

    const parts: string[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text) parts.push(text);
    }

    return parts.join(" ").replace(/\s+/g, " ").trim();
  }

  private extractFormFields(): string[] {
    const fields: string[] = [];
    const inputs = this.doc.querySelectorAll<HTMLElement>(
      "input, select, textarea, button[type='submit']"
    );

    inputs.forEach((el) => {
      // Try aria-label, then associated <label>, then placeholder, then name
      const label =
        el.getAttribute("aria-label") ||
        this.findLabelText(el) ||
        (el as HTMLInputElement).placeholder ||
        el.getAttribute("name") ||
        "";

      if (label.trim()) fields.push(label.trim());
    });

    return [...new Set(fields)]; // deduplicate
  }

  private findLabelText(el: HTMLElement): string {
    const id = el.id;
    if (id) {
      const label = this.doc.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() ?? "";
    }
    // Check if wrapped in a <label>
    const parent = el.closest("label");
    return parent?.textContent?.trim() ?? "";
  }
}
