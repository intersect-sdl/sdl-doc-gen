# Doc-Gen Configuration Guide

The `@sdl/doc-gen` library now supports flexible path configuration through multiple methods. This eliminates hardcoded paths and makes the library adaptable to different project structures.

## Configuration Methods

### 1. Environment Variables (Recommended)

Set environment variables before using the library:

```bash
# Primary configuration
export DOC_GEN_BASE_PATH="/Users/yourname/Projects/MyProject"

# Alternative environment variables (in priority order)
export PROJECT_ROOT="/Users/yourname/Projects/MyProject"
export WORKSPACE_ROOT="/Users/yourname/Projects/MyProject"
```

### 2. Programmatic Configuration

Configure paths in your application code:

```typescript
import { configureDocGen } from '@sdl/doc-gen';

// Configure before using other functions
configureDocGen({
  paths: {
    basePath: "/Users/yourname/Projects/MyProject",
    contentRoots: ["docs", "platforms", "api-docs"],
    slugPrefixes: ["/docs/", "/platforms/", "/api-docs/"],
    fileExtensions: ["md", "mdx"]
  }
});
```

### 3. SvelteKit Preprocessor Configuration

Configure directly in your `svelte.config.js`:

```javascript
import { doc_gen } from '@sdl/doc-gen';

const config = {
  preprocess: [
    doc_gen({
      paths: {
        basePath: process.env.PROJECT_ROOT || "/app",
        contentRoots: ["docs", "platforms"],
        slugPrefixes: ["/docs/", "/platforms/"],
        fileExtensions: ["md", "mdx"]
      }
    })
  ]
};

export default config;
```

### 4. Function-Level Configuration

Pass configuration to individual functions:

```typescript
import { getEntries, getSiteToc } from '@sdl/doc-gen';

const pathConfig = {
  basePath: "/path/to/project",
  contentRoots: ["documentation"],
  slugPrefixes: ["/documentation/"],
  fileExtensions: ["md"]
};

// Use with specific functions
const entries = await getEntries("./docs", pathConfig);
const toc = await getSiteToc("./docs", pathConfig);
```

## Configuration Options

### PathConfig Interface

```typescript
interface PathConfig {
  /**
   * Base path for the project root. Used for slug generation.
   * Can be absolute path or environment variable name.
   * 
   * Examples:
   * - "/Users/user/Projects/MyProject"
   * - "PROJECT_ROOT" (will read from process.env.PROJECT_ROOT)
   */
  basePath?: string;
  
  /**
   * Content root directories relative to basePath or absolute paths.
   * Default: ["docs", "platforms"]
   */
  contentRoots?: string[];
  
  /**
   * Path prefixes to remove from slugs.
   * Default: ["/docs/", "/platforms/"]
   */
  slugPrefixes?: string[];
  
  /**
   * File extensions to process.
   * Default: ["md", "mdx"]
   */
  fileExtensions?: string[];
}
```

## Environment Variables

The library checks these environment variables in priority order:

1. `DOC_GEN_BASE_PATH` - Specific to doc-gen
2. `PROJECT_ROOT` - Common project root variable
3. `WORKSPACE_ROOT` - Workspace/monorepo root
4. `PWD` - Current working directory (fallback)

## Usage Examples

### Example 1: Standard Setup

```bash
# Set environment
export PROJECT_ROOT="/Users/dev/MyProject"
```

```typescript
// In your SvelteKit app
import { getEntries, getSiteToc } from '@sdl/doc-gen';

// Uses environment variables automatically
const entries = await getEntries("../../../docs");
const toc = await getSiteToc("../../../platforms");
```

### Example 2: Custom Configuration

```typescript
import { configureDocGen, getEntries } from '@sdl/doc-gen';

// Configure once at application startup
configureDocGen({
  paths: {
    basePath: "/opt/myapp",
    contentRoots: ["content", "guides"],
    slugPrefixes: ["/content/", "/guides/"],
    fileExtensions: ["md", "mdx", "markdown"]
  }
});

// Use throughout your application
const entries = await getEntries("/opt/myapp/content");
```

### Example 3: Multiple Content Types

```typescript
import { configureDocGen } from '@sdl/doc-gen';

configureDocGen({
  paths: {
    basePath: process.env.PROJECT_ROOT,
    contentRoots: [
      "docs",           // Documentation
      "tutorials",      // Tutorials
      "api-specs",      // API documentation
      "examples"        // Code examples
    ],
    slugPrefixes: [
      "/docs/",
      "/tutorials/", 
      "/api-specs/",
      "/examples/"
    ],
    fileExtensions: ["md", "mdx"]
  }
});
```

### Example 4: Docker/Container Setup

```bash
# In Docker environment
export DOC_GEN_BASE_PATH="/app"
```

```typescript
// Your application automatically uses /app as base path
import { getEntries } from '@sdl/doc-gen';

const entries = await getEntries("/app/docs");
```

## Migration Guide

### From Hardcoded Paths

**Before:**
```typescript
// Hardcoded in library
const basepath = "/Users/x8q/Projects/INTERSECT/ACL";
```

**After:**
```bash
# Set environment variable
export PROJECT_ROOT="/Users/x8q/Projects/INTERSECT/ACL"
```

Or configure programmatically:
```typescript
import { configureDocGen } from '@sdl/doc-gen';

configureDocGen({
  paths: {
    basePath: "/Users/x8q/Projects/INTERSECT/ACL"
  }
});
```

### Updating Function Calls

**Old API:**
```typescript
const entries = await getEntries("../../../docs");
const toc = await getSiteToc("../../../platforms");
```

**New API (backward compatible):**
```typescript
// Still works - uses environment variables or defaults
const entries = await getEntries("../../../docs");

// Or with explicit configuration
const entries = await getEntries("../../../docs", {
  basePath: "/custom/path",
  slugPrefixes: ["/docs/"]
});
```

## Best Practices

1. **Use Environment Variables**: Set `PROJECT_ROOT` or `DOC_GEN_BASE_PATH` in your environment
2. **Configure Once**: Call `configureDocGen()` at application startup
3. **Version Control**: Don't commit absolute paths; use environment variables
4. **Docker**: Use `/app` as base path in containers
5. **Development**: Use relative paths or environment variables for portability

## Debugging Configuration

```typescript
import { getConfig } from '@sdl/doc-gen';

// Get current configuration
const config = getConfig();

// Log configuration for debugging
config.logConfig();

// Output:
// [doc-gen] Current configuration:
//   Base Path: /Users/dev/MyProject
//   Content Roots: [docs, platforms]  
//   Resolved Content Roots: [/Users/dev/MyProject/docs, /Users/dev/MyProject/platforms]
//   Slug Prefixes: [/docs/, /platforms/]
//   File Extensions: [md, mdx]
```

## Common Issues

### Issue: Slugs not generating correctly
**Solution**: Check your `basePath` and `slugPrefixes` configuration

### Issue: Files not found
**Solution**: Verify your `contentRoots` paths are correct

### Issue: Wrong file types processed
**Solution**: Update `fileExtensions` configuration

### Issue: Configuration not taking effect
**Solution**: Call `configureDocGen()` before using other functions

This configuration system provides maximum flexibility while maintaining backward compatibility!
