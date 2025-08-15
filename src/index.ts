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
export * from "./config/config";
export * from "./types";

import { parseMarkdown } from "./parser/markdown";
import type { DocGenOptions } from './types';
import { getConfig, configurePaths } from './config/config';

const defaults: DocGenOptions = {
  remarkPlugins: [],
  rehypePlugins: [],
};

/**
 * Configure doc-gen with path settings
 * Call this before using other doc-gen functions
 */
export function configureDocGen(options: DocGenOptions): void {
  if (options.paths) {
    configurePaths(options.paths);
  }
}

/**
 * The svelte preprocessor for use with svelte.preprocess
 *
 */
export const doc_gen = (options: DocGenOptions = defaults): Preprocessor => {
  // Configure paths if provided
  if (options.paths) {
    configurePaths(options.paths);
  }

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

