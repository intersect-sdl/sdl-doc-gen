import type { Node } from "unist";
import type { Plugin, Settings } from "unified";

export interface PathConfig {
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

export interface DocGenOptions {
  /**
   * **remarkPlugins** - an array with each element being either a {@link https://github.com/remarkjs/remark/blob/HEAD/doc/plugins.md#list-of-plugins remark plugin} or a tuple of `plugin` and `pluginOptions`. Default: `[ ]`. {@link https://mdsvex.com/docs#remarkplugins--rehypeplugins More details.}
   *
   * *examples:*
   * ```js
   * remarkPlugins: [ plugin1, plugin2 ]
   * ```
   * ```js
   * remarkPlugins: [ [ plugin, options], [ plugin2, options2 ] ]
   * ```
   * ```js
   * remarkPlugins: [ plugin, [ plugin2, options2 ] ]
   * ```
   */
  remarkPlugins?: Array<[Plugin, Settings] | Plugin>;
  /**
   * **rehypePlugins** - an array with each element being either a {@link https://github.com/rehypejs/rehype/blob/HEAD/doc/plugins.md#list-of-plugins rehype plugin} or a tuple of `plugin` and `pluginOptions`. Default: `[ ]`. {@link https://mdsvex.com/docs#remarkplugins--rehypeplugins More details.}
   *
   * *examples:*
   * ```js
   * rehypePlugins: [ plugin1, plugin2 ]
   * ```
   * ```js
   * rehypePlugins: [ [ plugin, options], [ plugin2, options2 ] ]
   * ```
   * ```js
   * rehypePlugins: [ plugin, [ plugin2, options2 ] ]
   * ```
   */
  rehypePlugins?: Array<[Plugin, Settings] | Plugin>;
  
  /**
   * Path configuration for content discovery and processing.
   */
  paths?: PathConfig;
}

export type PreprocessorReturn = Promise<
  | {
      code: string;
      data?: Record<string, unknown>;
      map?: string;
    }
  | undefined
>;

export interface Preprocessor {
  name: string;
  markup: (args: { content: string; filename: string }) => PreprocessorReturn;
}

export interface Page {
  meta: PageMeta;
  content: string;
}

export interface TocEntry {
  value: string;
  href: string;
  debth: number;
  numbering: number[];
  parent: string;
}

export interface ParsedMarkdown {
  content: string;
  meta: Record<string, any>;
}

export interface PageMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: string;
  readingTime: number;
  toc: TocEntry[];
  uuid?: string; // Added UUID property
}