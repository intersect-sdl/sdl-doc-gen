import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '../src/parser/markdown.js';

describe('parseMarkdown', () => {
  it('should process basic markdown content', async () => {
    const content = '# Hello World\n\nThis is a test.';
    const result = await parseMarkdown(content);
    
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.code).toContain('<h1');
  });

  it('should handle empty content', async () => {
    const result = await parseMarkdown('');
    
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.data).toBeDefined();
  });

  it('should handle content with frontmatter', async () => {
    const content = `---
title: Test
---

# Content`;
    
    const result = await parseMarkdown(content);
    
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(result.code).toContain('<h1');
  });
});
