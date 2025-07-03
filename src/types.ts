import type { Node } from "unist";
import type { Plugin, Settings } from "unified";

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