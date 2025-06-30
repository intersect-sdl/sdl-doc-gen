/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 * @import {Plugin} from 'unified'
 */

import fs from "fs/promises";
import path from "path";
import { compile } from "mdsvex";
import { extractFrontmatter } from "./frontmatter";

import remarkFrontmatter from "remark-frontmatter";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import { remarkDefinitionList, defListHastHandlers } from 'remark-definition-list';
import remarkDirective from "remark-directive";
import remarkGfm from 'remark-gfm';

import remarkRehype from 'remark-rehype';

import rehypeStringify from 'rehype-stringify'
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import type { Root } from "mdast";

import { visit } from "unist-util-visit";
import type { Plugin, Settings } from "unified";
import type { Directives } from "mdast-util-directive";

export interface Post {
  meta: PostMeta;
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

export interface PostMeta {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  published: string;
  readingTime: number;
  toc: TocEntry[];
}

interface Options extends Settings {
  components?: Record<string, string>; // map directive names to HTML/Svelte components
}

// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
const genericDirective: Plugin<[Options?]> = (options: Options = {}) => {
  //const components = options.components || {};

  console.log("generic directive");

  return (tree) => {
    //visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node: any) => {
    visit(tree, (node: any) => {
      //console.log("generic directive: node.type", node.type);
      if (node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective") {
        const directive = node as Directives;
        const name = directive.name;
        console.log("generic directive: visitor: ", node);

        if (!name) return;

        //const component = components[name] || name;
        node.type = "mdxJsxFlowElement";
        //node.name = component;
        node.attributes = Object.entries(directive.attributes || {}).map(([key, value]) => ({
          type: "mdxJsxAttribute",
          name: key,
          value: value || true,
        }));
        node.children = directive.children || [];
      }
    });
  };
};

// Expands code block language short names
function expandCodeBlockLanguagePlugin(): Transformer<Root, Root> {
  const transform = (lang: string): string => {
    const mappings: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      py: 'python',
      sh: 'bash',
      md: 'markdown',
      yml: 'YAML',
      yaml: 'YAML',
      json: 'JSON',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      toml: 'TOML',
      cpp: 'C++',
      cs: 'C#',
      asm: 'assembly'
    };
    return mappings[lang] || lang;
  };

  return (tree) => {
    visit(tree, ['element'], (_node) => {
      const node = _node as unknown as Element;
      if (!node.properties || !('data-language' in node.properties)) return;
      node.properties['data-language'] = transform(node.properties['data-language'] as string);
    });
  };
}

export async function parseMarkdown(filePath: string): Promise<ParsedMarkdown> {
  const raw = await fs.readFile(filePath, "utf-8");

  // Extract frontmatter
  const content = extractFrontmatter(raw);

  // Compile Markdown using mdsvex with support for directives
  const compiled = await compile(content.body, {
    extensions: [".svx", ".md"],
    remarkPlugins: [remarkDirective, genericDirective, remarkDefinitionList, remarkGfm],
    rehypePlugins: [rehypeStringify, rehypeSlug as any, [rehypeAutolinkHeadings as any, { behavior: "wrap" }], expandCodeBlockLanguagePlugin],
    // layout: {
    //   _: "./src/lib/layouts/DefaultLayout.svelte", // Optional
    // },
  });

  if (!compiled || typeof compiled.code !== "string") {
    throw new Error(`Failed to compile markdown at ${filePath}`);
  }

  return {
    content: compiled.code,
    meta: content.attributes,
  };
}

// Support `.md` and `.svx` extensions
export function isMarkdownFile(filename: string): boolean {
  return filename.endsWith(".md") || filename.endsWith(".svx");
}
