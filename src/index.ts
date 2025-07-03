export * from "./content/loadContent";
export * from "./parser/markdown";
export * from "./parser/frontmatter";
export * from "./parser/tsdoc";
export * from "./parser/pydoc";
export * from "./parser/notebook";
export * from "./parser/openapi";
export * from "./toc/buildTOC";
export * from "./link-resolver/resolveUUIDLinks";
export * from "./link-resolver/backlinks";
export * from "./link-resolver/uuidIndex";
export * from "./sitemap/generateSitemap";
export * from "./rss/generateRSS";

import { parseMarkdown } from "./parser/markdown";
import type { DocGenOptions } from './types';

const defaults = {
  remarkPlugins: [],
  rehypePlugins: [],
};


/**
 * The svelte preprocessor for use with svelte.preprocess
 *
 */
export const doc_gen = (options: DocGenOptions = defaults): Preprocessor => {
  return {
		name: '@sdl/doc-gen',
		markup: async ({ content, filename }) => {
      //console.log("doc-gen:markup: ", filename)
      const parsed = parseMarkdown(content, filename);
      return {
        code: parsed.contents as string,
        data: parsed.data as Record<string, unknown>,
        map: "",
      };
    }
  }
};

