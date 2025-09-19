import fg from 'fast-glob';
import fs from 'node:fs/promises';
import path$1 from 'path';
import frontMatter from 'front-matter';
import yaml from 'yaml';
import { unified } from 'unified';
import { h } from 'hastscript';
import { visit } from 'unist-util-visit';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkExtractFrontmatter from 'remark-extract-frontmatter';
import { remarkDefinitionList, defListHastHandlers } from 'remark-definition-list';
import sectionize from 'remark-sectionize';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkFlexibleToc from 'remark-flexible-toc';
import * as wikirefs from 'wikirefs';
import { syntaxWikiRefs } from 'micromark-extension-wikirefs';
import path from 'node:path';
import { toHtml } from 'hast-util-to-html';
import { fromHtml } from 'hast-util-from-html';
import { ORNL_COLORS, validateBpmnXml, generateStaticSVG, generateOrnlBpmnStyles } from '@sdl/bpmn';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import fs$1 from 'fs/promises';
import { Project, ModuleResolutionKind, ModuleKind, ScriptTarget, Node, SyntaxKind } from 'ts-morph';

function extractFrontmatter(content) {
  return frontMatter(content);
}

/**
 * Create an extension for `mdast-util-from-markdown` to enable directives in
 * markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable directives.
 */
function wikirefFromMarkdown(options = {}) {
    return {
        enter: {
            wikiLink: enterWikiLink,
        },
        exit: {
            wikiLinkTypeTxt: exitLinkTypeTxt,
            wikiLinkFileNameTxt: exitFileNameTxt,
            wikiLinkLabelTxt: exitLabelTxt,
            wikiLinkName: exitName,
            wikiLink: exitWikilink,
        },
    };
}

    function top(stack) {
    return stack[stack.length - 1];
    }

function exitWikilink( token) {
  const node = top(this.stack);

  wikirefs.CONST.MARKER.OPEN + node.name + wikirefs.CONST.MARKER.TYPE;
  node.data.item.htmlHref = "/docs";
  node.data.item.htmlText = "htmlText";
  node.data.item.doctype = "";
  node.data.hProperties.href = "/docs";
  node.data.hProperties.dataHref = "/docs";
  node.children = [
    {
      type: "text",
      value: node.name,
    },
  ];
  //console.log("exitWikilink:\n\ttoken: ", token, "\n\tnode: ", node);
  this.exit(token);
}

function exitName(token) {
  const node = top(this.stack);
  if (node.type !== "wikiLink") {
    throw new Error("Expected 'wikiLink' node type, got: " + node.type);
  }
  const name = this.sliceSerialize(token);
  node.name = name;
  //console.log("exitName: token: ", token, "name: ", name);
}

function exitLinkTypeTxt( token) {
  //console.log("exitLinkTypeTxt: token: ", token);
}

function exitFileNameTxt( token) {
  const node = this.stack[this.stack.length - 1];
  const filename = this.sliceSerialize(token);
  node.name = filename;
  node.data.item.filename = filename;
  //console.log("exitFileNameTxt: token: ", token, "\nnode: ", node);
}

function exitLabelTxt( token) {
  //console.log("exitLabelTxt: token: ", token);
}

function enterWikiLink( token) {
  this.enter(
    {
      type: "wikiLink",
      name: "",
      attributes: {},
      children: [],
      data: {
        item: { label: "" },
        hName: "a",
        hProperties: {
          className: ["wikilink"],
        },
      },
    },
    token
  );
}

// plugins/remark-wikiref-patched.ts


let warningIssued = false;

function remarkWikirefs( opts = {}) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = /** @type {Processor<Root>} */ this;
    const data = self.data();
    ////console.log("remarkWikiRefsPatched: self: ", self);

    if (
      !warningIssued &&
      ((self.Parser && self.Parser.prototype && self.Parser.prototype.blockTokenizers) || (self.Compiler && self.Compiler.prototype && self.Compiler.prototype.visitors))
    ) {
      warningIssued = true;
      console.warn("[remark-wiki-link] Warning: please upgrade to remark 13 to use this plugin");
    }

    ////console.log("remarkWikiRefsPatched: data: ", data);

    //add("micromarkExtensions", syntaxWikiLinks(opts));
    //add("fromMarkdownExtensions", fromMarkdownWikiLinks(opts));
    //   add("toMarkdownExtensions", toMarkdownWikiLinks(opts));

    const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = []);
    micromarkExtensions.push(syntaxWikiRefs(opts));

    const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
    fromMarkdownExtensions.push(wikirefFromMarkdown(opts));

    // const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
    // toMarkdownExtensions.push(toMarkdownWikiLinks(opts));

    // //console.log("remarkWikiRefsPatched: data: ", data);
    // //console.log("remarkWikiRefsPatched: data.micromarkExtensions: ", data.micromarkExtensions);
    // //console.log("remarkWikiRefsPatched: data.fromMarkdownExtensions: ", data.fromMarkdownExtensions);
    // //console.log("remarkWikiRefsPatched: data.toMarkdownExtensions: ", data.toMarkdownExtensions);
}

function _optionalChain$5(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * BPMN directive plugin for unified/remark processing with async support
 * 
 * This plugin handles the :::bpmn{src="./file.bpmn"} directive syntax,
 * loads BPMN files asynchronously, generates static SVG with ORNL theming, 
 * and creates appropriate HTML output for documentation sites.
 * 
 * With the migration to async markdown processing, BPMN directives are now
 * processed directly during plugin execution rather than using placeholders.
 * 
 * @module parser/bpmn-directive
 * @version 0.2.0
 */

/**
 * Configuration options for BPMN directive processing
 */























/**
 * Default configuration for BPMN directive processing
 */
const DEFAULT_OPTIONS = {
  baseDir: process.cwd(),
  theme: {
    primaryColor: ORNL_COLORS.PRIMARY,
    secondaryColor: ORNL_COLORS.SECONDARY,
    backgroundColor: ORNL_COLORS.WHITE,
    textColor: ORNL_COLORS.TEXT_PRIMARY
  },
  svgOptions: {
    width: 800,
    height: 600,
    fitViewport: true,
    includeTheme: true,
    zoom: 1.0
  },
  errorFallback: true,
  enableCache: true,
  maxFileSize: 5 * 1024 * 1024, // 5MB
  cssClasses: ['bpmn-diagram', 'ornl-theme']
};

/**
 * Cache for processed BPMN files and generated SVGs
 */
const bpmnCache = new Map



();

/**
 * Cache TTL in milliseconds (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Remark plugin for processing BPMN directives with async support
 * 
 * Handles directive syntax like:
 * - :::bpmn{src="./workflow.bpmn"}
 * - :::bpmn{src="../process.bpmn2" width="1000" height="800"}
 * 
 * Now properly supports async processing since the markdown pipeline is async.
 * Creates placeholders during parsing and processes them async during HTML generation.
 * 
 * @param options - Plugin configuration options
 * @returns Unified plugin function
 * 
 * @example
 * ```typescript
 * import { unified } from 'unified';
 * import remarkParse from 'remark-parse';
 * import remarkDirective from 'remark-directive';
 * import { bpmnDirective } from './bpmn-directive';
 * 
 * const processor = unified()
 *   .use(remarkParse)
 *   .use(remarkDirective)
 *   .use(bpmnDirective, {
 *     baseDir: './docs',
 *     theme: { primaryColor: '#00662C' }
 *   });
 * ```
 */
const bpmnDirective = (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async (tree, file) => {
    // Collect all BPMN directive nodes for async processing
    const bpmnNodes





 = [];
    
    // Visit all directive nodes in the markdown AST
    visit(tree, (node) => {
      return (node.type === 'containerDirective' || node.type === 'leafDirective') && 
             node.name === 'bpmn';
    }, (node, index, parent) => {
      
      if (index === undefined || !parent) {
        return;
      }
      
      // Extract attributes from directive
      const attributes = node.attributes || {};
      const src = attributes.src;
      
      if (!src) {
        replaceWithError(
          node, 
          index, 
          parent, 
          'BPMN directive missing required "src" attribute',
          config
        );
        return;
      }
      
      // Collect for async processing
      bpmnNodes.push({ node, index, parent, attributes, src });
    });
    
    // Process all BPMN nodes asynchronously
    await Promise.all(
      bpmnNodes.map(async ({ node, index, parent, attributes, src }) => {
        try {
          await processBpmnFileAsync(src, attributes, config, node, index, parent);
        } catch (error) {
          const err = error ;
          replaceWithError(
            node,
            index,
            parent,
            `Failed to process BPMN file "${src}": ${err.message}`,
            config
          );
        }
      })
    );
  };
};

/**
 * Process BPMN file asynchronously and replace directive node with SVG
 * 
 * @param src - Source file path
 * @param attributes - Directive attributes  
 * @param config - Plugin configuration
 * @param node - Original directive node
 * @param index - Node index in parent
 * @param parent - Parent node
 * 
 * @internal
 */
async function processBpmnFileAsync(
  src,
  attributes,
  config,
  node,
  index,
  parent
) {
  // Resolve file path
  const filePath = path.isAbsolute(src) 
    ? src 
    : path.resolve(config.baseDir, src);

  try {
    // Generate SVG using the existing async processBpmnFile function
    const svgResult = await processBpmnFile(filePath, attributes, config);

    // Create final HTML element
    const htmlElement = createBpmnHtml(svgResult.svg, attributes, config);

    // Replace the directive node with generated SVG HTML
    replaceWithHtml(node, index, parent, htmlElement);
    
  } catch (error) {
    const err = error ;
    console.error(`Error processing BPMN file "${filePath}":`, err);
    throw new Error(`BPMN processing failed: ${err.message}`);
  }
}



/**
 * Process BPMN file and generate SVG with caching
 * 
 * @param filePath - Absolute path to BPMN file
 * @param attributes - Directive attributes
 * @param config - Plugin configuration
 * @returns Promise resolving to SVG generation result
 * 
 * @internal
 */
async function processBpmnFile(
  filePath,
  attributes,
  config
) {
  
  // Check cache first
  if (config.enableCache) {
    const cached = bpmnCache.get(filePath);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return {
        svg: cached.svg,
        width: parseInt(attributes.width || config.svgOptions.width.toString()),
        height: parseInt(attributes.height || config.svgOptions.height.toString())
      };
    }
  }
  
  // Read BPMN file
  const stats = await fs.stat(filePath);
  if (stats.size > config.maxFileSize) {
    throw new Error(`File too large: ${stats.size} bytes (max: ${config.maxFileSize})`);
  }
  
  const bpmnXml = await fs.readFile(filePath, 'utf-8');
  
  // Validate BPMN content
  const validation = validateBpmnXml(bpmnXml);
  if (!validation.isValid) {
    throw new Error(`Invalid BPMN: ${validation.errors.join(', ')}`);
  }
  
  // Merge SVG options with directive attributes
  const svgOptions = {
    ...config.svgOptions,
    theme: config.theme,
    width: parseInt(attributes.width || String(config.svgOptions.width || 800)),
    height: parseInt(attributes.height || String(config.svgOptions.height || 600)),
    zoom: parseFloat(attributes.zoom || String(config.svgOptions.zoom || 1.0))
  };
  
  // Generate SVG
  const result = await generateStaticSVG(bpmnXml, svgOptions);
  
  // Cache result
  if (config.enableCache) {
    bpmnCache.set(filePath, {
      svg: result.svg,
      timestamp: Date.now(),
      fileSize: stats.size
    });
  }
  
  return result;
}

/**
 * Create HTML element containing BPMN SVG with ORNL styling
 * 
 * @param svg - Generated SVG content
 * @param attributes - Directive attributes
 * @param config - Plugin configuration
 * @returns HTML element object
 * 
 * @internal
 */
function createBpmnHtml(
  svg,
  attributes,
  config
) {
  
  // Generate ORNL theme styles
  const ornlStyles = generateOrnlBpmnStyles(config.theme);
  
  // Build CSS classes
  const cssClasses = [
    ...config.cssClasses,
    ...(attributes.class ? attributes.class.split(' ') : [])
  ];
  
  // Create container properties
  const containerProps = {
    className: cssClasses.join(' '),
    'data-bpmn-diagram': 'true'
  };
  
  // Add custom dimensions if specified
  if (attributes.width || attributes.height) {
    containerProps.style = {
      width: attributes.width ? `${attributes.width}px` : undefined,
      height: attributes.height ? `${attributes.height}px` : undefined
    };
  }

  return h('div', containerProps, [
    // Embedded styles for ORNL theming
    h('style', { 'data-ornl-bpmn-styles': 'true' }, ornlStyles),
    
    // SVG content wrapper - parse SVG string to HAST
    fromHtml(svg.trim())
  ]);
}

/**
 * Legacy build-time processor for converting BPMN placeholders to actual SVGs
 * 
 * Note: This function is now optional since BPMN processing happens directly
 * during the async plugin execution. It's kept for backward compatibility
 * and for cases where you might want post-processing of HTML content.
 * 
 * @param htmlContent - HTML content containing BPMN placeholders
 * @param baseDir - Base directory for resolving BPMN file paths
 * @param options - Processing options
 * @returns Promise resolving to processed HTML content
 * 
 * @example
 * ```typescript
 * // During build process
 * const processedHtml = await processBpmnPlaceholders(htmlContent, './docs');
 * ```
 */
async function processBpmnPlaceholders(
  htmlContent,
  baseDir = process.cwd(),
  options = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options, baseDir };
  
  // Parse HTML and find BPMN placeholders
  const placeholderRegex = /<div[^>]*data-bpmn-directive="true"[^>]*>(.*?)<\/div>/gs;
  
  let processedContent = htmlContent;
  const placeholders = Array.from(htmlContent.matchAll(placeholderRegex));
  
  for (const match of placeholders) {
    const placeholderHtml = match[0];
    
    try {
      // Extract data attributes
      const srcMatch = placeholderHtml.match(/data-bpmn-src="([^"]+)"/);
      const widthMatch = placeholderHtml.match(/data-bpmn-width="([^"]+)"/);
      const heightMatch = placeholderHtml.match(/data-bpmn-height="([^"]+)"/);
      const zoomMatch = placeholderHtml.match(/data-bpmn-zoom="([^"]+)"/);
      
      if (!srcMatch) continue;
      
      const src = srcMatch[1];
      const attributes = {
        src,
        width: _optionalChain$5([widthMatch, 'optionalAccess', _ => _[1]]) || String(config.svgOptions.width || 800),
        height: _optionalChain$5([heightMatch, 'optionalAccess', _2 => _2[1]]) || String(config.svgOptions.height || 600),
        zoom: _optionalChain$5([zoomMatch, 'optionalAccess', _3 => _3[1]]) || String(config.svgOptions.zoom || 1.0)
      };
      
      // Resolve file path
      const filePath = path.isAbsolute(src) 
        ? src 
        : path.resolve(baseDir, src);
      
      // Generate SVG from BPMN file
      const svgResult = await processBpmnFile(filePath, attributes, config);
      
      // Create final HTML element
      const htmlElement = createBpmnHtml(svgResult.svg, attributes, config);
      
      // Replace placeholder with actual SVG
      const finalHtml = htmlElement.outerHTML || htmlElement.toString();
      processedContent = processedContent.replace(placeholderHtml, finalHtml);
      
    } catch (error) {
      const err = error ;
      console.warn(`Failed to process BPMN placeholder: ${err.message}`);
      
      // Replace with error fallback if enabled
      if (config.errorFallback) {
        const errorHtml = createErrorHtml(`Failed to process BPMN: ${err.message}`);
        processedContent = processedContent.replace(placeholderHtml, errorHtml);
      }
    }
  }
  
  return processedContent;
}

/**
 * Create error HTML for failed BPMN processing
 * 
 * @param errorMessage - Error message to display
 * @param config - Plugin configuration
 * @returns HTML string for error display
 * 
 * @internal
 */
function createErrorHtml(
  errorMessage,
  config
) {
  const errorElement = h('div', {
    className: 'bpmn-error ornl-theme',
    style: {
      border: `2px solid ${ORNL_COLORS.SECONDARY}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      backgroundColor: 'rgba(254, 80, 0, 0.1)',
      color: ORNL_COLORS.TEXT_PRIMARY,
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  }, [
    h('div', { className: 'error-icon', style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, '⚠️'),
    h('p', { className: 'error-message', style: { margin: '0', fontWeight: 'bold' } }, 'BPMN processing failed'),
    h('p', { className: 'error-details', style: { margin: '0.5rem 0 0 0', fontSize: '0.875rem' } }, errorMessage)
  ]);
  
  return toHtml(errorElement);
}

/**
 * Replace directive node with error fallback HTML
 * 
 * @param node - Original directive node
 * @param index - Node index in parent
 * @param parent - Parent node
 * @param errorMessage - Error message to display
 * @param config - Plugin configuration
 * 
 * @internal
 */
function replaceWithError(
  node,
  index,
  parent,
  errorMessage,
  config
) {
  
  if (!config.errorFallback) {
    throw new Error(errorMessage);
  }
  
  const errorElement = h('div', {
    className: 'bpmn-error ornl-theme',
    style: {
      border: `2px solid ${ORNL_COLORS.SECONDARY}`,
      borderRadius: '0.5rem',
      padding: '1rem',
      backgroundColor: 'rgba(254, 80, 0, 0.1)', // FORGE orange with opacity
      color: ORNL_COLORS.TEXT_PRIMARY,
      fontFamily: 'Inter, system-ui, sans-serif'
    }
  }, [
    h('div', { className: 'error-icon', style: { fontSize: '1.25rem', marginBottom: '0.5rem' } }, '⚠️'),
    h('p', { className: 'error-message', style: { margin: '0', fontWeight: 'bold' } }, 'BPMN processing failed'),
    h('p', { className: 'error-details', style: { margin: '0.5rem 0 0 0', fontSize: '0.875rem' } }, errorMessage)
  ]);
  
  replaceWithHtml(node, index, parent, errorElement);
}

/**
 * Replace directive node with HTML element
 * 
 * @param node - Original directive node
 * @param index - Node index in parent
 * @param parent - Parent node
 * @param htmlElement - HTML element to insert
 * 
 * @internal
 */
function replaceWithHtml(
  node,
  index,
  parent,
  htmlElement
) {
  
  // Create a new HTML node with properly serialized content
  const htmlNode = {
    type: 'html',
    value: toHtml(htmlElement),
    position: node.position
  };
  
  // Replace the directive node
  parent.children[index] = htmlNode;
}

function _optionalChain$4(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 * @import {Plugin} from 'unified'
 */



// Directive Options





// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
const genericDirective = (options = {}) => {
  return (tree) => {
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node) => {
      // //console.log("generic directive: node.type", node.type);
      if (node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective") {
        const directive = node ;
        ////console.log("genericDirective: ", directive);
        const name = directive.name;
        if (!name) return;

        const data = node.data || (node.data = {});
        const tagName = node.type === "textDirective" ? "span" : "div";

        data.hName = tagName;
        data.hProperties = h(tagName, node.attributes || {}).properties;
        if (name === "note" && node.type === "containerDirective") {
          data.hProperties = {
            className: ["p-4", "gap-3", "text-sm", "bg-primary-50", "dark:bg-gray-800", "text-primary-800", "dark:text-primary-400", "rounded-lg"],
            role: ["alert"],
          };
        }
        if (name === "rdfterm" && node.type === "textDirective") {
          if (directive.children.length == 2) {
            const firstChild = directive.children[0] ;
            const secondChild = directive.children[1] ;
            
            if (_optionalChain$4([firstChild, 'optionalAccess', _ => _.value]) && _optionalChain$4([secondChild, 'optionalAccess', _2 => _2.name])) {
              const children = [
                {
                  type: "text",
                  value: firstChild.value + ":" + secondChild.name,
                  position: { start: firstChild.position, end: secondChild.position },
                },
              ];
              node.children = children;
              node.type = "emphasis";
              data.hProperties = { className: ["mr-1", "px-2", "py-1", "bg-gray-200", "rounded-lg"] };
            }
          }
        } else {
          node.type = "mdxJsxFlowElement";
          node.name = name;
          node.attributes = Object.entries(directive.attributes || {}).map(([key, value]) => ({
            type: "mdxJsxAttribute",
            name: key,
            value: value || true,
          }));
          node.children = directive.children || [];
        }
      }
    });
  };
};

async function parseMarkdown(content, options) {
  // Use the configured base path from environment, options, or hardcoded fallback
  const configuredBasePath = _optionalChain$4([options, 'optionalAccess', _3 => _3.baseDir]) || process.env.PROJECT_ROOT || '/Users/x8q/Projects/INTERSECT/ACL/';
  
  const processor = unified()
    .use(remarkParse)
    //.use(html_parser)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkExtractFrontmatter, { yaml: yaml.parse })
    .use(remarkWikirefs, {baseUrl: "/docs/"})
    .use(sectionize)
    .use(remarkDirective)
    .use(bpmnDirective, {  // Use configured base path for BPMN files
      baseDir: configuredBasePath,
      errorFallback: true,
      enableCache: true
    })
    .use(genericDirective)
    .use(remarkDefinitionList)
    .use(remarkGfm)
    .use(remarkFlexibleToc)
    .use(remarkRehype, { allowDangerousHtml: true, allowDangerousCharacters: true, handlers: { ...defListHastHandlers } })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeStringify, { allowDangerousHtml: true });

  //const processed = processor.processSync(content);
  const processed = await processor
    .process(content)
    .then((result) => {
      return result;
    })
    .catch((err) => {
      console.error("Error generating docs:", err);
      throw err; // Re-throw to handle properly
    });
  
  return { code: String(processed.value), data: processed.data };
}

async function getFrontmatter(filePath) {
  const document = await fs.readFile(filePath, "utf-8");
  // Extract frontmatter
  const content = extractFrontmatter(document);
  const meta = content.attributes;

  return {
    content: "", //processed.toString(),
    meta: meta ,
  };
}

// Support `.md`, `.svx`, and `.mdx` extensions
function isMarkdownFile(filename) {
  return filename.endsWith(".md") || filename.endsWith(".svx") || filename.endsWith(".mdx");
}

async function parseMarkdownWithFrontmatter(content) {
  const { attributes, body } = extractFrontmatter(content);
  const processed = await parseMarkdown(body);
  return {
    html: processed.code,
    meta: attributes
  };
}

function _nullishCoalesce$2(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$3(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

/**
 * Configuration manager for doc-gen library
 */
class DocGenConfig {
  
  

   constructor(pathConfig) {
    this.config = this.resolveConfig(pathConfig);
  }

  /**
   * Get or create the singleton configuration instance
   */
  static getInstance(pathConfig) {
    if (!DocGenConfig.instance) {
      DocGenConfig.instance = new DocGenConfig(pathConfig);
    } else if (pathConfig) {
      // Update existing instance with new config
      DocGenConfig.instance.updateConfig(pathConfig);
    }
    return DocGenConfig.instance;
  }

  /**
   * Update the current configuration
   */
  updateConfig(pathConfig) {
    this.config = this.resolveConfig(pathConfig);
  }

  /**
   * Resolve configuration from multiple sources with fallbacks
   */
   resolveConfig(pathConfig) {
    // Default configuration
    const defaults = {
      basePath: this.resolveBasePath(),
      contentRoots: ['docs', 'platforms'],
      slugPrefixes: ['/docs/', '/platforms/'],
      fileExtensions: ['md', 'mdx']
    };

    // Override with provided config
    const resolved = {
      basePath: _optionalChain$3([pathConfig, 'optionalAccess', _ => _.basePath]) ? this.resolvePath(pathConfig.basePath) : defaults.basePath,
      contentRoots: _nullishCoalesce$2(_optionalChain$3([pathConfig, 'optionalAccess', _2 => _2.contentRoots]), () => ( defaults.contentRoots)),
      slugPrefixes: _nullishCoalesce$2(_optionalChain$3([pathConfig, 'optionalAccess', _3 => _3.slugPrefixes]), () => ( defaults.slugPrefixes)),
      fileExtensions: _nullishCoalesce$2(_optionalChain$3([pathConfig, 'optionalAccess', _4 => _4.fileExtensions]), () => ( defaults.fileExtensions))
    };

    return resolved;
  }

  /**
   * Resolve base path from multiple sources
   */
   resolveBasePath() {
    // 1. Check environment variables
    const envVars = [
      'DOC_GEN_BASE_PATH',
      'PROJECT_ROOT',
      'WORKSPACE_ROOT',
      'PWD'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value && this.isValidPath(value)) {
        //console.log(`[doc-gen] Using base path from ${envVar}: ${value}`);
        return path.resolve(value);
      }
    }

    // 2. Fallback to current working directory
    const cwd = process.cwd();
    //console.log(`[doc-gen] Using current working directory as base path: ${cwd}`);
    return cwd;
  }

  /**
   * Resolve a path that might be an environment variable or absolute path
   */
   resolvePath(pathOrEnvVar) {
    // Check if it's an environment variable reference
    if (process.env[pathOrEnvVar]) {
      const envPath = process.env[pathOrEnvVar];
      //console.log(`[doc-gen] Resolved path from env ${pathOrEnvVar}: ${envPath}`);
      return path.resolve(envPath);
    }

    // Check if it's a Windows absolute path (even on non-Windows systems)
    if (/^[A-Za-z]:(\\|\/)/i.test(pathOrEnvVar)) {
      // Normalize Windows paths to forward slashes for consistent processing
      return pathOrEnvVar.replace(/\\/g, '/');
    }

    // Check if it's already an absolute path
    if (path.isAbsolute(pathOrEnvVar)) {
      return pathOrEnvVar;
    }

    // Resolve relative to current working directory
    return path.resolve(pathOrEnvVar);
  }

  /**
   * Check if a path exists and is accessible
   */
   isValidPath(pathToCheck) {
    try {
      const resolved = path.resolve(pathToCheck);
      // Basic validation - path should be absolute after resolution
      return path.isAbsolute(resolved);
    } catch (e) {
      return false;
    }
  }

  /**
   * Get the resolved base path
   */
  getBasePath() {
    return this.config.basePath;
  }

  /**
   * Get resolved content root paths (absolute)
   */
  getContentRoots() {
    return this.config.contentRoots.map(root => {
      if (path.isAbsolute(root)) {
        return root;
      }
      return path.resolve(this.config.basePath, root);
    });
  }

  /**
   * Get slug prefixes for content root removal
   */
  getSlugPrefixes() {
    return this.config.slugPrefixes;
  }

  /**
   * Get file extensions to process
   */
  getFileExtensions() {
    return this.config.fileExtensions;
  }

  /**
   * Generate file glob patterns for content discovery
   */
  getFilePatterns() {
    return this.config.fileExtensions.map(ext => `**/*.${ext}`);
  }

  /**
   * Convert file path to slug based on configuration
   */
  pathToSlug(filePath) {
    // Normalize the path and convert backslashes to forward slashes for consistent processing
    let normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    const normalizedBasePath = path.normalize(this.config.basePath).replace(/\\/g, '/');
    
    // Remove file extension
    let slug = normalizedPath.replace(/\.[^/.]+$/, "");
    
    // Remove base path if present
    if (slug.startsWith(normalizedBasePath)) {
      slug = slug.slice(normalizedBasePath.length);
    }
    
    // Remove Windows drive letter if present (e.g., "/C:" becomes "")
    slug = slug.replace(/^\/[A-Za-z]:/, '');
    
    // Remove configured prefixes
    for (const prefix of this.config.slugPrefixes) {
      if (slug.startsWith(prefix)) {
        slug = slug.slice(prefix.length);
        break; // Only remove the first matching prefix
      }
    }
    
    return slug;
  }

  /**
   * Get full configuration object (for debugging)
   */
  getConfig() {
    return { ...this.config };
  }

  /**
   * Log current configuration (for debugging)
   */
  logConfig() {
    //console.log('[doc-gen] Current configuration:');
    //console.log('  Base Path:', this.config.basePath);
    //console.log('  Content Roots:', this.config.contentRoots);
    //console.log('  Resolved Content Roots:', this.getContentRoots());
    //console.log('  Slug Prefixes:', this.config.slugPrefixes);
    //console.log('  File Extensions:', this.config.fileExtensions);
  }
}

/**
 * Convenience function to get configuration instance
 */
function getConfig(pathConfig) {
  return DocGenConfig.getInstance(pathConfig);
}

/**
 * Convenience function to configure doc-gen paths
 */
function configurePaths(pathConfig) {
  DocGenConfig.getInstance(pathConfig);
}

function _nullishCoalesce$1(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain$2(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }


function getJSDocDescription(node) {
  if (node.getKind() !== SyntaxKind.Parameter) {
    return '';
  }

  const parent = node.getParentOrThrow();
  if (!node.getSymbol()) {
    return '';
  }

  // Get all JSDoc comments from the parent
  const jsDocable = parent ;
  if (!jsDocable.getJsDocs) {
    return '';
  }

  const docs = jsDocable.getJsDocs();
  const paramName = node.getSymbol().getName();
  
  // Find all param tags that match this parameter's name
  const paramDocs = docs.flatMap((doc) => 
    doc.getTags()
      .filter((tag) => tag.getTagName() === 'param')
      .filter((tag) => {
        const tagText = tag.getText();
        return tagText.startsWith(`@param ${paramName}`) || tagText.startsWith(`@param {`) && tagText.includes(`} ${paramName}`);
      })
      .map((tag) => tag.getCommentText() || '')
  );

  return paramDocs.filter((text) => text !== '').join('\n');
}
















function extractTags(jsDocs) {
  const tags = {};
  for (const doc of jsDocs) {
    const tagNodes = doc.getTags();
    for (const tag of tagNodes) {
      const tagName = tag.getTagName();
      const tagText = String(tag.getCommentText() || "");
      // Initialize the tag array if it doesn't exist
      if (!tags[tagName]) {
        tags[tagName] = [];
      }
      tags[tagName].push(tagText);
    }
  }
  return tags;
}

function extractUUIDFromComment(comment) {
  // Try matching uuid: or uuid= pattern
  const match = comment.match(/uuid\s*[=:]\s*([0-9a-fA-F-]{36})/i);
  if (match) {
    return match[1];
  }
  return undefined;
}

function parseTypeScriptDocs(filePath) {
  try {
    // Get the directory from the file path for module resolution
    const sourceDir = path$1.dirname(filePath);

    // Initialize Project with strict mode TypeScript config
    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.Bundler,
        strict: true,
        types: []
      }
    });

    const sourceFile = project.addSourceFileAtPath(filePath);
    const docs = [];

    // First look for module-level comments at the top of the file
    const fileComments = sourceFile.getLeadingCommentRanges();
    for (const comment of _nullishCoalesce$1(fileComments, () => ( []))) {
      const commentText = comment.getText();
      const uuid = extractUUIDFromComment(commentText);
      if (uuid) {
        docs.push({
          name: path$1.basename(filePath),
          kind: "file",
          documentation: commentText,
          filePath,
          uuid,
          tags: {}
        });
      }
    }

    // Then process JSDoc comments for all nodes
    sourceFile.forEachDescendant((node) => {
      if (!Node.isJSDocable(node)) return;

      const symbol = node.getSymbol();
      const name = _optionalChain$2([symbol, 'optionalAccess', _9 => _9.getName, 'call', _10 => _10()]);
      if (!name) return;

      const jsDocs = node.getJsDocs();
      // Allow nodes without JSDoc if they have leading comments
      const leadingComments = node.getLeadingCommentRanges();
      if (jsDocs.length === 0 && !_optionalChain$2([leadingComments, 'optionalAccess', _11 => _11.length])) return;

      // Process JSDoc comments
      const docTexts = [];
      const exampleBlocks = [];
      const tags = {};

      // Also check leading comments for UUIDs
      if (leadingComments) {
        for (const comment of leadingComments) {
          const commentText = comment.getText();
          const uuid = extractUUIDFromComment(commentText);
          if (uuid) {
            tags.uuid = [uuid];
          }
          if (!comment.getText().startsWith('/*')) {
            // Skip single-line comments
            continue;
          }
          docTexts.push(commentText.replace(/^\/\*+\s*|\s*\*+\/$/g, ''));
        }
      }

      for (const doc of jsDocs) {
        // Process main comment text
        const fullText = doc.getCommentText() || "";
        const mainText = fullText.split('\n')
          .filter(line => !line.trim().startsWith('@'))
          .join('\n')
          .trim();

        if (mainText) {
          docTexts.push(mainText);
        }

        // Extract tags
        Object.assign(tags, extractTags([doc]));
      }

      const documentation = docTexts.join('\n\n');
      const example = _optionalChain$2([tags, 'access', _12 => _12.example, 'optionalAccess', _13 => _13[0]]);
      const docWithExample = example ? documentation + '\n\n' + example : documentation;
      const extracted = {
        name,
        kind: node.getKindName(),
        documentation: docWithExample,
        filePath,
        tags,
        uuid: _optionalChain$2([tags, 'access', _14 => _14.uuid, 'optionalAccess', _15 => _15[0]])
      };

      // Extract code info for functions
      if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
        const parameters = node.getParameters().map(param => ({
          name: param.getName(),
          type: param.getType().getText(),
          description: getJSDocDescription(param)
        }));

        const returnType = node.getReturnType();
        const returnDescription = node.getJsDocs()
          .map(doc => doc.getTags().find(tag => tag.getTagName() === 'returns'))
          .filter(tag => tag)
          .map(tag => tag.getCommentText())
          .filter(text => text)
          .join('\n');

        extracted.codeInfo = {
          line: node.getStartLineNumber(),
          column: node.getStart() - node.getStartLinePos(),
          parameters,
          returns: {
            type: returnType.getText(),
            description: returnDescription || undefined
          }
        };
      }

      docs.push(extracted);
    });

    return docs;
  } catch (err) {
    console.error('Error parsing TS:', filePath, err);
    return [];
  }
}

// libs/ssg/src/parser/pydoc.ts








async function parsePythonDocs(filePath) {
  const content = await fs$1.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const docs = [];

  let currentDoc = {};
  let insideDoc = false;
  let docLines = [];

  for (const line of lines) {
    if (/^def\s+(\w+)/.test(line)) {
      if (currentDoc.name && docLines.length) {
        currentDoc.docstring = docLines.join("\n");
        if (currentDoc.uuid && currentDoc.name) {
          docs.push(currentDoc );
        }
      }
      const [, name] = line.match(/^def\s+(\w+)/) || [];
      currentDoc = {
        name,
        filePath,
        uuid: undefined,
        docstring: "",
      };
      insideDoc = false;
      docLines = [];
    } else if (/^\s*"""/.test(line)) {
      insideDoc = !insideDoc;
      if (!insideDoc && currentDoc.name) {
        currentDoc.docstring = docLines.join("\n");
        if (currentDoc.uuid && currentDoc.name) {
          docs.push(currentDoc );
        }
      }
    } else if (insideDoc) {
      docLines.push(line);
      const uuidMatch = line.match(/uuid\s*[:=]\s*([0-9a-fA-F-]{36})/);
      if (uuidMatch) {
        currentDoc.uuid = uuidMatch[1];
      }
    }
  }

  return docs;
}

function _optionalChain$1(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }







async function buildUUIDIndex(contentDir, outputFile) {
  const index = {};

  const files = await fg(["**/*.md", "**/*.svx", "**/*.ts", "**/*.py"], {
    cwd: contentDir,
    absolute: true,
  });

  for (const file of files) {
    if (isMarkdownFile(file)) {
      try {
        const content = await fs$1.readFile(file, 'utf-8');
        const parsed = await parseMarkdownWithFrontmatter(content);
        const uuid = _optionalChain$1([parsed, 'access', _ => _.meta, 'optionalAccess', _2 => _2.uuid]);
        if (uuid) {
          index[uuid] = {
            uuid,
            filePath: file,
            type: "markdown",
            title: _optionalChain$1([parsed, 'access', _3 => _3.meta, 'optionalAccess', _4 => _4.title]) || "",
          };
        }
      } catch (err) {
        console.warn(`Error parsing markdown: ${file}`, err);
      }
    } else if (file.endsWith(".ts")) {
      try {
        const docs = await parseTypeScriptDocs(file);
        for (const doc of docs) {
          if (doc.uuid) {
            index[doc.uuid] = {
              uuid: doc.uuid,
              filePath: file,
              type: "typescript",
              title: doc.name,
            };
          }
        }
      } catch (err) {
        console.warn(`Error parsing TypeScript: ${file}`, err);
      }
    } else if (file.endsWith(".py")) {
      try {
        const docs = await parsePythonDocs(file);
        for (const doc of docs) {
          if (doc.uuid) {
            index[doc.uuid] = {
              uuid: doc.uuid,
              filePath: doc.filePath,
              type: "python",
              title: doc.name,
            };
          }
        }
      } catch (err) {
        console.warn(`Error parsing Python: ${file}`, err);
      }
    }
  }

  if (outputFile) {
    try {
      await fs$1.writeFile(outputFile, JSON.stringify(index, null, 2), "utf-8");
    } catch (err) {
      console.error(`Failed to write UUID index cache to ${outputFile}`, err);
    }
  }

  return index;
}

function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }
/**
 * Replace all instances of [[uuid:...]] with relative links to the appropriate file
 */
async function resolveUUIDLinks(contentDir, cachePath) {
  const uuidIndex = await buildUUIDIndex(contentDir, cachePath);

  const files = await fg(["**/*.md", "**/*.svx", "**/*.ts", "**/*.py"], {
    cwd: contentDir,
    absolute: true,
  });

  for (const file of files) {
    let content = await fs$1.readFile(file, "utf-8");

    const updated = content.replace(/\[\[uuid:([0-9a-fA-F-]{36})\]\]/g, (_, uuid) => {
      const entry = uuidIndex[uuid];
      if (!entry) return `[[MISSING UUID: ${uuid}]]`;

      let relativePath = path$1.relative(path$1.dirname(file), entry.filePath).replace(/\\/g, "/");
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }

      //console.log(file, path.dirname(file), entry.filePath);
      return `[${_nullishCoalesce(entry.title, () => ( "Link"))}](${relativePath})`;
    });

    if (updated !== content) {
      await fs$1.writeFile(file, updated, "utf-8");
    }
  }
}

// libs/ssg/src/link-resolver/backlinks.ts








/**
 * Builds a backlink index mapping target UUIDs to their referencing file paths
 */
async function buildBacklinkIndex(contentDir) {
  const files = await fg(["**/*.{md,svx,ts,py}"], {
    cwd: contentDir,
    absolute: true,
  });

  const backlinks = {};

  for (const file of files) {
    const content = await fs$1.readFile(file, "utf-8");
    const matches = [...content.matchAll(/\[\[uuid:([0-9a-fA-F-]{36})\]\]/g)];

    for (const match of matches) {
      const uuid = match[1];
      if (!backlinks[uuid]) {
        backlinks[uuid] = { count: 0, sources: [] };
      }
      backlinks[uuid].count++;
      backlinks[uuid].sources.push(file);
    }
  }

  return backlinks;
}

/**
 * Optionally persist backlink index to disk for analysis or build tasks
 */
async function writeBacklinkIndex(index, outPath) {
  await fs$1.writeFile(outPath, JSON.stringify(index, null, 2), "utf-8");
}

var backlinks = /*#__PURE__*/Object.freeze({
  __proto__: null,
  buildBacklinkIndex: buildBacklinkIndex,
  writeBacklinkIndex: writeBacklinkIndex
});

function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
async function getPostsInPath(docpath, pathConfig) {
  //console.log("getPostInPath: ", docpath);
  
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();
  
  const files = await fg(filePatterns, {
    cwd: docpath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      //console.log("getPostsInPath: ", currentValue);
      await fs.readFile(currentValue[1], "utf-8");
      const parsed = await parseMarkdown(currentValue[1] ).catch((err) => {
        console.error("Error generating docs:", err);
        process.exit(1);
      });

      return {
        content: parsed.code, //processed.toString(),
        meta: parsed.data,
      };
    })
  );

  return posts;
}

// New function to build UUID index
async function buildUUIDIndexForContent(contentPath, cachePath) {
  try {
    const uuidIndex = await buildUUIDIndex(contentPath, cachePath);
    //console.log("UUID Index built successfully:", uuidIndex);
    return uuidIndex;
  } catch (err) {
    console.error("Error building UUID index:", err);
    throw err;
  }
}

async function getEntries(contentPath, pathConfig) {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();

  // Build UUID index
  const uuidIndex = await buildUUIDIndexForContent(contentPath);

  const files = await fg(filePatterns, {
    cwd: contentPath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      const slug = config.pathToSlug(currentValue[1]);

      // Include UUID information if available
      const uuidEntry = Object.values(uuidIndex).find(entry => entry.filePath === currentValue[1]);

      return {
        slug: slug,
        uuid: _optionalChain([uuidEntry, 'optionalAccess', _ => _.uuid]) || undefined,
      };
    })
  );

  return posts;
}

async function getSiteToc(contentPath, pathConfig) {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();

  // Build UUID index
  const uuidIndex = await buildUUIDIndexForContent(contentPath);

  const files = await fg(filePatterns, {
    cwd: contentPath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      const parsed = await getFrontmatter(currentValue[1] ).catch((err) => {
        console.error("Error generating Toc:", err);
        process.exit(1);
      });
      
      parsed.meta.slug = config.pathToSlug(currentValue[1]);

      // Include UUID information if available
      const uuidEntry = Object.values(uuidIndex).find(entry => entry.filePath === currentValue[1]);
      parsed.meta.uuid = _optionalChain([uuidEntry, 'optionalAccess', _2 => _2.uuid]) || undefined; // Changed null to undefined for compatibility

      return parsed;
    })
  );
  
  return posts;
}

async function getAllSites(path, pathConfig) {
  return await getPostsInPath(path, pathConfig);
}

async function getPageBySlug(contentroot, slug) {
  const _path = contentroot + slug + ".md";
  const content = await fs.readFile(_path, "utf-8");
  const post = await parseMarkdown(content, { baseDir: contentroot });
  if (post) {
        // Process BPMN placeholders to replace them with actual SVG content
    //console.log('[DEBUG] About to process BPMN placeholders...');
    const processedContent = await processBpmnPlaceholders(
      post.code, // HTML content to process
      contentroot // Base directory for resolving BPMN file paths
    );
    //console.log('[DEBUG] BPMN placeholders processing complete.');
    
    return {
      content: processedContent,
      meta: post.data,
    };
  }
}

async function resolveLinksInContent(contentDir, cachePath) {
  await resolveUUIDLinks(contentDir, cachePath);
}

async function trackBacklinks(contentDir, outPath) {
  const backlinkIndex = await buildBacklinkIndex(contentDir);

  if (outPath) {
    const { writeBacklinkIndex } = await Promise.resolve().then(function () { return backlinks; });
    await writeBacklinkIndex(backlinkIndex, outPath);
  }
}

function convertNotebookToHTML(nbPath) {
  // TODO: Use nbconvert output or parse .ipynb directly
  return `<!-- HTML content from ${nbPath} -->`;
}

function generateOpenAPIEmbed(specUrl) {
  return `<iframe src='https://redocly.github.io/redoc/?url=${specUrl}' width='100%' height='1000px'></iframe>`;
}

function buildTOC(contentDir) {
  // TODO: Traverse folders and build sidebar tree
  return {};
}

function generateSitemap(contentDir, outPath) {
  // TODO: Traverse content and generate sitemap.xml
}

function generateRSS(blogDir, outPath) {
  // TODO: Generate RSS XML from blog posts
}

const defaults = {
  remarkPlugins: [],
  rehypePlugins: [],
};

/**
 * Configure doc-gen with path settings
 * Call this before using other doc-gen functions
 */
function configureDocGen(options) {
  if (options.paths) {
    configurePaths(options.paths);
  }
}

/**
 * The svelte preprocessor for use with svelte.preprocess
 *
 */
const doc_gen = (options = defaults) => {
  // Configure paths if provided
  if (options.paths) {
    configurePaths(options.paths);
  }

  return {
		name: '@sdl/doc-gen',
		markup: async ({ content, filename }) => {
      ////console.log("doc-gen:markup: ", filename)
      
      // Only process markdown files (.md, .svx, .mdx)
      if (!isMarkdownFile(filename)) {
        // Return undefined to let other preprocessors handle this file
        return undefined;
      }
      
      try {
        const parsed = await parseMarkdown(content);
        return {
          code: parsed.code ,
          data: parsed.data ,
          map: "",
        };
      } catch (error) {
        console.error(`Doc-gen processing failed for ${filename}:`, error);
        return {
          code: content, // Return original content on error
          data: {},
          map: "",
        };
      }
    }
  }
};

// @ts-ignore
globalThis.global = globalThis;

if (typeof window !== "undefined") {
  // @ts-ignore
  window.global = globalThis;
}

export { DocGenConfig, buildBacklinkIndex, buildTOC, buildUUIDIndex, buildUUIDIndexForContent, configureDocGen, configurePaths, convertNotebookToHTML, doc_gen, extractFrontmatter, generateOpenAPIEmbed, generateRSS, generateSitemap, getAllSites, getConfig, getEntries, getFrontmatter, getPageBySlug, getSiteToc, isMarkdownFile, parseMarkdown, parseMarkdownWithFrontmatter, parsePythonDocs, parseTypeScriptDocs, resolveLinksInContent, resolveUUIDLinks, trackBacklinks, writeBacklinkIndex };
//# sourceMappingURL=main.js.map
