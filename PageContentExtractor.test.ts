/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { PageContentExtractor } from "./PageContentExtractor.js";

describe("PageContentExtractor — Req 6.2, 7.1", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("extracts visible text from the page", () => {
    document.body.innerHTML = `<h1>Passport Application</h1><p>Apply online for a new passport.</p>`;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.visibleText).toContain("Passport Application");
    expect(ctx.visibleText).toContain("Apply online for a new passport.");
  });

  it("skips script and style content", () => {
    document.body.innerHTML = `
      <p>Visible text</p>
      <script>var x = 1;</script>
      <style>.foo { color: red; }</style>
    `;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.visibleText).toContain("Visible text");
    expect(ctx.visibleText).not.toContain("var x");
    expect(ctx.visibleText).not.toContain(".foo");
  });

  it("extracts form field labels by aria-label", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Full Name" />
      <input type="email" aria-label="Email Address" />
    `;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.formFields).toContain("Full Name");
    expect(ctx.formFields).toContain("Email Address");
  });

  it("extracts form field labels by associated <label> element", () => {
    document.body.innerHTML = `
      <label for="dob">Date of Birth</label>
      <input type="date" id="dob" />
    `;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.formFields).toContain("Date of Birth");
  });

  it("extracts form field labels by placeholder", () => {
    document.body.innerHTML = `<input type="text" placeholder="Enter your Aadhaar number" />`;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.formFields).toContain("Enter your Aadhaar number");
  });

  it("deduplicates form field labels", () => {
    document.body.innerHTML = `
      <input type="text" aria-label="Name" />
      <input type="text" aria-label="Name" />
    `;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.formFields!.filter((f) => f === "Name").length).toBe(1);
  });

  it("returns empty formFields when no form elements present", () => {
    document.body.innerHTML = `<p>Just some text</p>`;
    const extractor = new PageContentExtractor(document);
    const ctx = extractor.extract();
    expect(ctx.formFields).toEqual([]);
  });
});
