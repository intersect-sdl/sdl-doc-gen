import { describe, it, expect } from 'vitest';
import { doc_gen } from '../src/index.js';

describe('SDL Site Integration Tests', () => {
  it('should process actual docs content correctly', async () => {
    const preprocessor = doc_gen({
      paths: {
        basePath: process.env.PROJECT_ROOT || '/Users/x8q/Projects/INTERSECT/ACL/',
        contentRoots: ['docs', 'platforms'],
        slugPrefixes: ['/docs/', '/platforms/'],
        fileExtensions: ['md', 'mdx']
      }
    });

    // Test with sample architecture overview content
    const markdownContent = `---
title: "Architecture Overview"
description: "An overview of the Scientific Data Layer (SDL) architecture"
published: true
---

# Architecture Overview

> **Disclaimer:** Many features are still in development.

The Scientific Data Layer (SDL) is a modular platform designed to manage scientific data using semantic web principles.

## Architectural Principles

SDL is built upon the following design principles:

- **Linked Data Platform (LDP)**: Resources are addressable and follow LDP standards.
- **Microservices**: Each core function is encapsulated as an independent service.
- **Semantic Interoperability**: Uses RDF, JSON-LD, and standard ontologies.

### Components

1. Frontend (SvelteKit)
2. Backend Services
3. Storage Layer

This creates a flexible foundation for scientific infrastructures.`;

    const result = await preprocessor.markup({
      content: markdownContent,
      filename: '/docs/architecture_overview.md'
    });

    // Verify the markdown was processed correctly
    expect(result?.code).toBeDefined();
    expect(result?.code).toContain('<h1');
    expect(result?.code).toContain('Architecture Overview');
    expect(result?.code).toContain('<h2');
    expect(result?.code).toContain('Architectural Principles');
    expect(result?.code).toContain('<blockquote');
    expect(result?.code).toContain('Disclaimer');
    expect(result?.code).toContain('<ul>');
    expect(result?.code).toContain('<li>');
    expect(result?.code).toContain('<strong>');
    expect(result?.code).toContain('Linked Data Platform');
    expect(result?.code).toContain('<ol>');
    expect(result?.code).toContain('SvelteKit');

    // Verify frontmatter was extracted
    expect(result?.data).toBeDefined();
    expect(result?.data?.title).toBe('Architecture Overview');
    expect(result?.data?.description).toContain('Scientific Data Layer');
    expect(result?.data?.published).toBe(true);
  });

  it('should handle complex markdown features', async () => {
    const preprocessor = doc_gen();

    const complexMarkdown = `# Test Document

## Code Blocks

\`\`\`javascript
const config = {
  name: 'test'
};
\`\`\`

## Links and References

Visit [SDL Documentation](/docs) for more information.

## Lists

### Ordered List
1. First item
2. Second item
   - Nested bullet
   - Another nested item

### Unordered List
- Item A
- Item B
  1. Nested number
  2. Another number

## Emphasis

This is **bold** and this is *italic* text.

## Tables (if supported)

| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |

## Blockquotes

> This is a blockquote
> with multiple lines`;

    const result = await preprocessor.markup({
      content: complexMarkdown,
      filename: '/test/complex.md'
    });

    expect(result?.code).toBeDefined();
    expect(result?.code).toContain('<pre>');
    expect(result?.code).toContain('<code class="language-javascript">');
    expect(result?.code).toContain('javascript');
    expect(result?.code).toContain('<a ');
    expect(result?.code).toContain('href="/docs"');
    expect(result?.code).toContain('<ol>');
    expect(result?.code).toContain('<ul>');
    expect(result?.code).toContain('<strong>');
    expect(result?.code).toContain('<em>');
    expect(result?.code).toContain('<blockquote>');
  });
});
