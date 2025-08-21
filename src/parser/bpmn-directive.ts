/**
 * BPMN directive plugin for unified/remark processing
 * 
 * This plugin handles the :::bpmn{src="./file.bpmn"} directive syntax,
 * loads BPMN files, generates static SVG with ORNL theming, and creates
 * appropriate HTML output for documentation sites.
 * 
 * @module parser/bpmn-directive
 * @version 0.1.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { h } from 'hastscript';
import { visit } from 'unist-util-visit';
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
  type BpmnThemeOptions
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
    includeTheme: true
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
 * Remark plugin for processing BPMN directives
 * 
 * Handles directive syntax like:
 * - :::bpmn{src="./workflow.bpmn"}
 * - :::bpmn{src="../process.bpmn2" width="1000" height="800"}
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
  
  return (tree, file) => {
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
      
      try {
        // Process BPMN file synchronously (limitation of unified plugins)
        processBpmnFileSync(src, attributes, config, node, index, parent);
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
    });
  };
};

/**
 * Process BPMN file synchronously (simplified version for plugin compatibility)
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
function processBpmnFileSync(
  src: string,
  attributes: Record<string, string>,
  config: Required<BpmnDirectiveOptions>,
  node: any,
  index: number,
  parent: any
): void {
  try {
    // Resolve file path
    const filePath = path.isAbsolute(src) 
      ? src 
      : path.resolve(config.baseDir, src);
    
    // For now, create a placeholder that will be processed at build time
    // This allows the plugin to work with the unified pipeline
    const placeholderElement = createBpmnPlaceholder(src, attributes, config);
    
    // Replace the directive node with placeholder HTML
    replaceWithHtml(node, index, parent, placeholderElement);
    
  } catch (error) {
    const err = error as Error;
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
    width: parseInt(attributes.width || config.svgOptions.width!.toString()),
    height: parseInt(attributes.height || config.svgOptions.height!.toString()),
    zoom: parseFloat(attributes.zoom || config.svgOptions.zoom!.toString())
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
 * Create BPMN placeholder element for build-time processing
 * 
 * @param src - Source file path
 * @param attributes - Directive attributes
 * @param config - Plugin configuration
 * @returns HTML element placeholder
 * 
 * @internal
 */
function createBpmnPlaceholder(
  src: string,
  attributes: Record<string, string>,
  config: Required<BpmnDirectiveOptions>
): any {
  
  // Build CSS classes
  const cssClasses = [
    ...config.cssClasses,
    'bpmn-placeholder',
    ...(attributes.class ? attributes.class.split(' ') : [])
  ];
  
  // Create container properties with data attributes for build-time processing
  const containerProps: Record<string, any> = {
    className: cssClasses.join(' '),
    'data-bpmn-src': src,
    'data-bpmn-directive': 'true',
    'data-bpmn-width': attributes.width || config.svgOptions.width?.toString(),
    'data-bpmn-height': attributes.height || config.svgOptions.height?.toString(),
    'data-bpmn-zoom': attributes.zoom || config.svgOptions.zoom?.toString()
  };
  
  // Add custom dimensions if specified
  if (attributes.width || attributes.height) {
    containerProps.style = {
      width: attributes.width ? `${attributes.width}px` : undefined,
      height: attributes.height ? `${attributes.height}px` : undefined,
      minHeight: '200px',
      border: `1px dashed ${ORNL_COLORS.NEUTRAL}`,
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8f9fa'
    };
  }
  
  return h('div', containerProps, [
    h('div', { className: 'bpmn-placeholder-content' }, [
      h('p', { 
        style: { 
          margin: '0', 
          color: ORNL_COLORS.TEXT_PRIMARY,
          fontFamily: 'Inter, system-ui, sans-serif'
        } 
      }, `📊 BPMN Diagram: ${path.basename(src)}`),
      h('p', { 
        style: { 
          margin: '0.5rem 0 0 0', 
          fontSize: '0.875rem', 
          color: ORNL_COLORS.SECONDARY,
          fontFamily: 'Inter, system-ui, sans-serif'
        } 
      }, 'Will be rendered during build process')
    ])
  ]);
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
    
    // SVG content (raw HTML)
    h('div', { 
      className: 'bpmn-svg-container',
      innerHTML: svg 
    })
  ]);
}

/**
 * Build-time processor for converting BPMN placeholders to actual SVGs
 * 
 * This function should be called during the build process to replace
 * BPMN placeholders with actual rendered SVG content.
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
        width: widthMatch?.[1] || config.svgOptions.width!.toString(),
        height: heightMatch?.[1] || config.svgOptions.height!.toString(),
        zoom: zoomMatch?.[1] || config.svgOptions.zoom!.toString()
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
  return `
<div class="bpmn-error ornl-theme" style="
  border: 2px solid ${ORNL_COLORS.SECONDARY};
  border-radius: 0.5rem;
  padding: 1rem;
  background-color: rgba(254, 80, 0, 0.1);
  color: ${ORNL_COLORS.TEXT_PRIMARY};
  font-family: Inter, system-ui, sans-serif;
">
  <div class="error-icon" style="font-size: 1.25rem; margin-bottom: 0.5rem;">⚠️</div>
  <p class="error-message" style="margin: 0; font-weight: bold;">Failed to load BPMN diagram</p>
  <p class="error-details" style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${errorMessage}</p>
</div>
  `.trim();
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
    h('p', { className: 'error-message', style: { margin: '0', fontWeight: 'bold' } }, 'Failed to load BPMN diagram'),
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
  
  // Create a new HTML node
  const htmlNode = {
    type: 'html',
    value: htmlElement.outerHTML || htmlElement.toString(),
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
