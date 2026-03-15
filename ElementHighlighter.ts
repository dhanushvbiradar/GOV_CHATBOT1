/**
 * ElementHighlighter — visually highlights DOM elements referenced in navigation responses.
 *
 * Requirements: 6.3
 */

const HIGHLIGHT_CLASS = "cgsa-highlight";
const HIGHLIGHT_STYLE = `
  outline: 3px solid #f59e0b !important;
  outline-offset: 2px !important;
  background-color: rgba(245, 158, 11, 0.15) !important;
`;

export class ElementHighlighter {
  private highlighted: Element[] = [];

  constructor(private readonly doc: Document) {}

  /**
   * Apply highlight to elements matching the given CSS selectors or text descriptions.
   * Req 6.3: visually highlight referenced UI elements on the host page.
   */
  highlight(targets: string[]): void {
    this.clear();

    for (const target of targets) {
      try {
        // Try as CSS selector first
        const els = this.doc.querySelectorAll(target);
        if (els.length > 0) {
          els.forEach((el) => this.applyHighlight(el));
          continue;
        }
      } catch {
        // Not a valid CSS selector — fall through to text search
      }

      // Fall back to text-content matching
      const matched = this.findByText(target);
      matched.forEach((el) => this.applyHighlight(el));
    }
  }

  /** Remove all active highlights */
  clear(): void {
    this.highlighted.forEach((el) => {
      el.classList.remove(HIGHLIGHT_CLASS);
      (el as HTMLElement).style.cssText = (el as HTMLElement).style.cssText
        .replace(HIGHLIGHT_STYLE, "");
    });
    this.highlighted = [];
  }

  private applyHighlight(el: Element): void {
    el.classList.add(HIGHLIGHT_CLASS);
    (el as HTMLElement).style.cssText += HIGHLIGHT_STYLE;
    this.highlighted.push(el);
  }

  private findByText(text: string): Element[] {
    const lower = text.toLowerCase();
    const candidates = this.doc.querySelectorAll<HTMLElement>(
      "button, a, label, input, select, textarea, [role='button'], [role='link']"
    );
    const results: Element[] = [];
    candidates.forEach((el) => {
      const label =
        el.getAttribute("aria-label")?.toLowerCase() ||
        el.textContent?.toLowerCase().trim() ||
        (el as HTMLInputElement).placeholder?.toLowerCase() ||
        "";
      if (label.includes(lower)) results.push(el);
    });
    return results;
  }
}
