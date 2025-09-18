/**
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

import fs from 'node:fs/promises';
import path from 'node:path';
import { h, s } from 'hastscript';
import { toHtml } from 'hast-util-to-html';
import { visit } from 'unist-util-visit';
import { fromHtml } from 'hast-util-from-html'
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import type { ContainerDirective, LeafDirective, TextDirective } from 'mdast-util-directive';

// Import from @sdl/bpmn - will be available after workspace setup
// @ts-ignore - Temporary ignore until workspace is configured
import {
  generateStaticSVG,
  validateBpmnXml,
  ORNL_COLORS,
  generateOrnlBpmnStyles,
  type SvgGenerationOptions,
  type BpmnThemeOptions,
  SvgGenerationResult
} from '@sdl/bpmn';

/**
 * Configuration options for BPMN directive processing
 */
export interface BpmnDirectiveOptions {
  /** Base directory for resolving relative BPMN file paths */
  baseDir?: string;
  
  /** Default theme options for ORNL styling */
  theme?: BpmnThemeOptions;
  
  /** Default SVG generation options */
  svgOptions?: SvgGenerationOptions;
  
  /** Whether to enable error fallback rendering */
  errorFallback?: boolean;
  
  /** Cache BPMN files and generated SVGs */
  enableCache?: boolean;
  
  /** Maximum file size for BPMN files (in bytes) */
  maxFileSize?: number;
  
  /** Custom CSS classes to apply to BPMN containers */
  cssClasses?: string[];
}

/**
 * Default configuration for BPMN directive processing
 */
const DEFAULT_OPTIONS: Required<BpmnDirectiveOptions> = {
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
const bpmnCache = new Map<string, {
  svg: string;
  timestamp: number;
  fileSize: number;
}>();

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
export const bpmnDirective: Plugin<[BpmnDirectiveOptions?], Root> = (options = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  return async (tree, file) => {
    // Collect all BPMN directive nodes for async processing
    const bpmnNodes: Array<{
      node: any;
      index: number;
      parent: any;
      attributes: Record<string, string>;
      src: string;
    }> = [];
    
    // Visit all directive nodes in the markdown AST
    visit(tree, (node: any) => {
      return (node.type === 'containerDirective' || node.type === 'leafDirective') && 
             node.name === 'bpmn';
    }, (node: any, index: number | undefined, parent: any) => {
      
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
          const err = error as Error;
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
  src: string,
  attributes: Record<string, string>,
  config: Required<BpmnDirectiveOptions>,
  node: any,
  index: number,
  parent: any
): Promise<void> {
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
    const err = error as Error;
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
  filePath: string,
  attributes: Record<string, string>,
  config: Required<BpmnDirectiveOptions>
): Promise<{ svg: string; width: number; height: number }> {
  
  // Check cache first
  if (config.enableCache) {
    const cached = bpmnCache.get(filePath);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return {
        svg: cached.svg,
        width: parseInt(attributes.width || config.svgOptions.width!.toString()),
        height: parseInt(attributes.height || config.svgOptions.height!.toString())
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
  const svgOptions: SvgGenerationOptions = {
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
 * Simple SVG parser to convert SVG string to HAST structure
 * This is a minimal parser for our specific SVG use case
 */
function parseSvgToHast(svgString: string): any {
  // Basic regex to extract SVG tag and content
  const svgMatch = svgString.match(/<svg([^>]*)>(.*)<\/svg>/s);
  if (!svgMatch) {
    return h('div', { className: 'bpmn-error' }, 'Invalid SVG content');
  }

  const [, attributes, content] = svgMatch;
  
  // Parse attributes
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let attrMatch;
  while ((attrMatch = attrRegex.exec(attributes)) !== null) {
    attrs[attrMatch[1]] = attrMatch[2];
  }

  // For now, return the SVG as raw content within the element
  // This is a simple approach that should work with hastscript
  return h('svg', attrs, { type: 'raw', value: content });
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
  svg: string,
  attributes: Record<string, string>,
  config: Required<BpmnDirectiveOptions>
): any {
  
  // Generate ORNL theme styles
  const ornlStyles = generateOrnlBpmnStyles(config.theme);
  
  // Build CSS classes
  const cssClasses = [
    ...config.cssClasses,
    ...(attributes.class ? attributes.class.split(' ') : [])
  ];
  
  // Create container properties
  const containerProps: Record<string, any> = {
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
export async function processBpmnPlaceholders(
  htmlContent: string,
  baseDir: string = process.cwd(),
  options: BpmnDirectiveOptions = {}
): Promise<string> {
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
        width: widthMatch?.[1] || String(config.svgOptions.width || 800),
        height: heightMatch?.[1] || String(config.svgOptions.height || 600),
        zoom: zoomMatch?.[1] || String(config.svgOptions.zoom || 1.0)
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
      const err = error as Error;
      console.warn(`Failed to process BPMN placeholder: ${err.message}`);
      
      // Replace with error fallback if enabled
      if (config.errorFallback) {
        const errorHtml = createErrorHtml(`Failed to process BPMN: ${err.message}`, config);
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
  errorMessage: string,
  config: Required<BpmnDirectiveOptions>
): string {
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
  node: any,
  index: number,
  parent: any,
  errorMessage: string,
  config: Required<BpmnDirectiveOptions>
): void {
  
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
  node: any,
  index: number,
  parent: any,
  htmlElement: any
): void {
  
  // Create a new HTML node with properly serialized content
  const htmlNode = {
    type: 'html',
    value: toHtml(htmlElement),
    position: node.position
  };
  
  // Replace the directive node
  parent.children[index] = htmlNode;
}

/**
 * Clear BPMN file cache
 * 
 * @param filePath - Specific file to clear, or undefined to clear all
 */
export function clearBpmnDirectiveCache(filePath?: string): void {
  if (filePath) {
    bpmnCache.delete(filePath);
  } else {
    bpmnCache.clear();
  }
}

/**
 * Get cache statistics for debugging
 * 
 * @returns Cache statistics object
 */
export function getBpmnDirectiveCacheStats(): {
  size: number;
  entries: Array<{ filePath: string; timestamp: number; fileSize: number }>;
} {
  return {
    size: bpmnCache.size,
    entries: Array.from(bpmnCache.entries()).map(([filePath, data]) => ({
      filePath,
      timestamp: data.timestamp,
      fileSize: data.fileSize
    }))
  };
}
