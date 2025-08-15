# SDL Documentation Generator

A **configurable** documentation generation library for the Scientific Data Layer (SDL) frontend, supporting Markdown processing with semantic enhancements and flexible path configuration.

## ✨ New: Configurable Path Support

Version 0.0.1 introduces flexible path configuration, eliminating hardcoded paths and making the library adaptable to different project structures.

### Quick Setup

```bash
# Set environment variable
export PROJECT_ROOT="/path/to/your/project"
```

```typescript
import { getEntries, getSiteToc } from '@sdl/doc-gen';

// Automatically uses PROJECT_ROOT
const entries = await getEntries("./docs");
const toc = await getSiteToc("./platforms");
```

**📖 For detailed configuration options, see [CONFIG.md](./CONFIG.md)**

## Overview

This library processes Markdown content with support for frontmatter, wiki-style references, and semantic markup. It's used to generate SDL's documentation and help pages.

## Features

### Markdown Processing

- Frontmatter extraction
- Wiki-style references
- Code highlighting
- Custom directives

### Semantic Extensions

- RDF term linking
- Ontology references
- SPARQL query embedding
- Diagram generation

## Installation

```bash
pnpm add @sdl/doc-gen
```

## Usage

### Basic Markdown Processing

```typescript
import { parseMarkdown } from '@sdl/doc-gen';

const content = `
---
title: Example Document
---

# Hello World

This is a test document with a [[wiki-link]].
`;

const html = await parseMarkdown(content);
```

### Frontmatter Extraction

```typescript
import { getFrontmatter } from '@sdl/doc-gen';

const { meta } = await getFrontmatter('path/to/document.md');
console.log(meta.title); // "Example Document"
```

### Wiki References

```typescript
const content = `
Check out the [[Catalog Service]] for more information.

This links to an [[external-doc|External Document]].
`;

const processed = await parseMarkdown(content, {
  wikiRefs: {
    baseUrl: '/docs/',
    resolveHref: (fname) => `/docs/${fname}`
  }
});
```

## Configuration

### Default Options

```typescript
const defaultOptions = {
  remarkPlugins: [
    remarkFrontmatter,
    remarkWikiRefs,
    remarkGfm
  ],
  rehypePlugins: [
    rehypeSlug,
    rehypeAutolinkHeadings
  ]
};
```

### Wiki Reference Options

```typescript
interface WikiRefOptions {
  baseUrl: string;
  resolveDocType?: (fname: string) => string;
  resolveHtmlHref?: (fname: string) => string;
  resolveHtmlText?: (fname: string) => string;
  resolveEmbedContent?: (fname: string) => { type: string; value: string };
}
```

## API Reference

### Functions

#### `parseMarkdown`
Process Markdown content into HTML.

```typescript
async function parseMarkdown(
  content: string, 
  options?: ProcessorOptions
): Promise<string>
```

#### `getFrontmatter`
Extract frontmatter from a Markdown file.

```typescript
async function getFrontmatter(
  filePath: string
): Promise<{ meta: PageMeta }>
```

### Interfaces

#### `PageMeta`
```typescript
interface PageMeta {
  title?: string;
  description?: string;
  author?: string;
  date?: string;
  tags?: string[];
  [key: string]: any;
}
```

#### `ProcessorOptions`
```typescript
interface ProcessorOptions {
  remarkPlugins?: Plugin[];
  rehypePlugins?: Plugin[];
  wikiRefs?: WikiRefOptions;
}
```

## Development

### Project Structure

```
libs/doc-gen/
├── src/
│   ├── parser/       # Markdown processing
│   ├── plugins/      # Custom remark plugins
│   └── utils/        # Helper functions
└── tests/
```

### Building

```bash
pnpm build
```

### Testing

```bash
pnpm test
```

## Contributing

1. Use TypeScript
2. Add tests for new functionality
3. Document public APIs
4. Update examples for significant changes

## License

MIT
