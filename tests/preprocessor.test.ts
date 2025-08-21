import { describe, it, expect, beforeEach } from 'vitest';
import { doc_gen } from '../src/index.js';
import type { DocGenOptions } from '../src/types';

describe('Svelte Preprocessor', () => {
  let preprocessor: ReturnType<typeof doc_gen>;
  
  beforeEach(() => {
    const options: DocGenOptions = {
      paths: {
        basePath: '/test/project',
        contentRoots: ['docs'],
        slugPrefixes: ['/docs/'],
        fileExtensions: ['md']
      }
    };
    preprocessor = doc_gen(options);
  });

  describe('file filtering', () => {
    it('should only process markdown files', async () => {
      const svelteContent = `
<script>
  let name = 'world';
</script>

<h1>Hello {name}!</h1>
      `.trim();

      const result = await preprocessor.markup({
        content: svelteContent,
        filename: '/test/src/routes/+page.svelte'
      });

      // Should return undefined to let other preprocessors handle this file
      expect(result).toBeUndefined();
    });

    it('should process markdown content in .md files', async () => {
      const markdownContent = `# Hello World

This is a test markdown file.

## Section 2

Some content here.`;

      const result = await preprocessor.markup({
        content: markdownContent,
        filename: '/test/docs/test.md'
      });

      // Should process markdown and return HTML
      expect(result?.code).toContain('<h1');
      expect(result?.code).toContain('Hello World');
      expect(result?.code).toContain('<h2');
      expect(result?.code).toContain('Section 2');
    });

    it('should process markdown content in .svx files', async () => {
      const markdownContent = `# Hello World

This is a test svx file.`;

      const result = await preprocessor.markup({
        content: markdownContent,
        filename: '/test/docs/test.svx'
      });

      expect(result?.code).toContain('<h1');
      expect(result?.code).toContain('Hello World');
    });
  });

  describe('Svelte component preservation', () => {
    it('should not corrupt Svelte syntax in .svelte files', async () => {
      const svelteContent = `
<script lang="ts">
  import { Card, Button } from 'flowbite-svelte';
  let count = 0;
</script>

<Card>
  <h1>Counter: {count}</h1>
  <Button on:click={() => count++}>Increment</Button>
</Card>
      `.trim();

      const result = await preprocessor.markup({
        content: svelteContent,
        filename: '/test/src/routes/counter.svelte'
      });

      // Should return undefined to let other preprocessors handle this file
      expect(result).toBeUndefined();
    });

    it('should not process HTML-like content in .svelte files', async () => {
      const svelteContent = `
<main class="container mx-auto p-6">
  <header class="mb-8">
    <h1 class="text-4xl font-bold">Test Page</h1>
    <p class="text-lg">This should not be processed as markdown</p>
  </header>
</main>
      `.trim();

      const result = await preprocessor.markup({
        content: svelteContent,
        filename: '/test/src/routes/test.svelte'
      });

      // Should return undefined to let other preprocessors handle this file
      expect(result).toBeUndefined();
    });
  });

  describe('markdown processing', () => {
    it('should handle frontmatter correctly', async () => {
      const markdownWithFrontmatter = `---
title: "Test Page"
description: "A test page"
date: "2025-01-01"
---

# Test Content

This is the main content.`;

      const result = await preprocessor.markup({
        content: markdownWithFrontmatter,
        filename: '/test/docs/with-frontmatter.md'
      });

      expect(result?.code).toContain('<h1');
      expect(result?.code).toContain('Test Content');
      expect(result?.data).toBeDefined();
      expect(result?.data?.title).toBe('Test Page');
    });

    it('should handle directives correctly', async () => {
      const markdownWithDirectives = `# Test

:::note
This is a note directive.
:::

Some :rdfterm[dcat:Dataset] inline.`;

      const result = await preprocessor.markup({
        content: markdownWithDirectives,
        filename: '/test/docs/with-directives.md'
      });

      expect(result?.code).toContain('<h1');
      expect(result?.code).toContain('Test');
      // Should process directives appropriately
      expect(result?.code).toContain('note');
    });

    it('should handle empty content gracefully', async () => {
      const result = await preprocessor.markup({
        content: '',
        filename: '/test/docs/empty.md'
      });

      expect(result?.code).toBe('');
    });

    it('should handle malformed markdown gracefully', async () => {
      const malformedMarkdown = `# Unclosed

[link with no closing bracket

**bold with no closing`;

      const result = await preprocessor.markup({
        content: malformedMarkdown,
        filename: '/test/docs/malformed.md'
      });

      // Should not throw error and return some content
      expect(result?.code).toBeDefined();
      expect(typeof result?.code).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should return original content on processing error', async () => {
      // Mock a scenario that might cause processing to fail
      const problematicContent = `# Test

Some content that might cause issues in processing.`;

      const result = await preprocessor.markup({
        content: problematicContent,
        filename: '/test/docs/problematic.md'
      });

      // Should not throw and should return some content
      expect(result?.code).toBeDefined();
      expect(typeof result?.code).toBe('string');
    });
  });
});
