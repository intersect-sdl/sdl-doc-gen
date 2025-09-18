# BPMN Directive Documentation

The BPMN directive allows you to embed BPMN (Business Process Model and Notation) diagrams directly in markdown documents. The directive supports both **leaf syntax** and **container syntax** for maximum flexibility.

## Supported Syntaxes

### Leaf Directive Syntax (Recommended for Simple Usage)

Use the concise leaf syntax when you simply want to include a BPMN file:

```markdown
::bpmn{src="workflow.bpmn" width="800" height="600"}
```

### Container Directive Syntax (Recommended for Block-Level Content)

Use the container syntax when you want more explicit block-level semantics:

```markdown
:::bpmn{src="workflow.bpmn" width="800" height="600"}
:::
```

Both syntaxes produce identical output and are processed by the same underlying implementation.

## Attributes

| Attribute | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `src` | string | ✅ Yes | - | Path to the BPMN file (relative to base directory) |
| `width` | string | ❌ No | `"100%"` | Width of the diagram container |
| `height` | string | ❌ No | `"400px"` | Height of the diagram container |
| `theme` | string | ❌ No | `"ornl"` | Theme for styling (supports `"ornl"`, `"default"`) |

## Examples

### Basic Usage

**Leaf syntax:**
```markdown
::bpmn{src="./diagrams/user-registration.bpmn"}
```

**Container syntax:**
```markdown
:::bpmn{src="./diagrams/user-registration.bpmn"}
:::
```

### With Custom Dimensions

**Leaf syntax:**
```markdown
::bpmn{src="./workflows/data-processing.bpmn" width="1200" height="800"}
```

**Container syntax:**
```markdown
:::bpmn{src="./workflows/data-processing.bpmn" width="1200" height="800"}
:::
```

### With Theme Customization

**Leaf syntax:**
```markdown
::bpmn{src="./processes/approval-flow.bpmn" theme="default" width="900" height="600"}
```

**Container syntax:**
```markdown
:::bpmn{src="./processes/approval-flow.bpmn" theme="default" width="900" height="600"}
:::
```

## File Path Resolution

BPMN files are resolved relative to the configured base directory. For example:

- Base directory: `/docs`
- Directive: `::bpmn{src="./workflows/example.bpmn"}`
- Resolved path: `/docs/workflows/example.bpmn`

## Error Handling

The directive provides graceful error handling for common issues:

### Missing `src` Attribute

```markdown
::bpmn{width="400"}
```

**Output:** Error message indicating the missing `src` attribute.

### File Not Found

```markdown
::bpmn{src="nonexistent.bpmn"}
```

**Output:** Error message with file path details.

### Invalid BPMN Content

If the BPMN file exists but contains invalid XML or BPMN content, an error message will be displayed with details about the validation failure.

## Integration with Doc-Gen

The BPMN directive is automatically available in the doc-gen library's markdown processing pipeline. No additional setup is required beyond including BPMN files in your documentation structure.

## Choosing Between Syntaxes

**Use leaf syntax (`::bpmn{}`) when:**
- You want concise, inline-style inclusion
- The directive is part of flowing text content
- You prefer minimal markup

**Use container syntax (`:::bpmn{}:::`) when:**
- You want explicit block-level semantics
- The diagram is a standalone section element
- You're following consistent block directive patterns in your documentation

Both syntaxes are functionally equivalent and the choice is primarily stylistic. The implementation handles both through unified AST processing.
