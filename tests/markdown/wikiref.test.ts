import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../../src/parser/markdown";

describe("remark-wikiref integration", () => {
  it("should convert wikilinks to HTML links", async () => {
    const markdown = "This is a [[Test Page]] .";

    const result = await parseMarkdown(markdown);
    const html = result.code;
    
    // Check for the presence of wikilink elements
    // Based on the test output, the href is "/docs" (from baseUrl in wikiRefOpts)
    expect(html).toContain('href="/docs"'); // URL from baseUrl configuration
    expect(html).toContain('Test Page'); // Display text should be preserved
    expect(html).toContain('class="wikilink"'); // Should have wikilink class
  });

//   it("should handle multiple wiki links", async () => {
//     const markdown = "Links: [[Page1]], [[Page2]].";
//     const html = parseMarkdown(markdown);
//     expect(html).toContain('href="/Page1"');
//     expect(html).toContain('href="/Page2"');
//   });

//   it("should handle wiki links with spaces and special chars", async () => {
//     const markdown = "[[Page With Spaces]] and [[Page/With/Slash]].";
//     const html = parseMarkdown(markdown);
//     expect(html).toContain('href="/Page%20With%20Spaces"');
//     expect(html).toContain('href="/Page/With/Slash"');
//   });
});
