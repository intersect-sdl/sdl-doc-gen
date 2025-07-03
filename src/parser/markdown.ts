/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 * @import {Plugin} from 'unified'
 */

import fs from "node:fs/promises";
import { extractFrontmatter } from "./frontmatter";
import { blockHtml } from "./html_block";

import yaml from "yaml";
import { unified } from "unified";
import type { Processor } from "unified";
import remarkParse from "remark-parse";

import remarkFrontmatter from "remark-frontmatter";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import { remarkDefinitionList, defListHastHandlers } from "remark-definition-list";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkFlexibleToc from "remark-flexible-toc";

import remarkRehype from "remark-rehype";

import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import { h } from "hastscript";
import { visit } from "unist-util-visit";
import type { Plugin, Settings } from "unified";
import type { Directives } from "mdast-util-directive";

import { Node } from "unist";

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
}

// Directive Options
type DirectiveOptions = {
  // Add your expected plugin options here
  someFlag?: boolean;
};

// This plugin is an example to let users write HTML with directives.
// It’s informative but rather useless.
// See below for others examples.
const genericDirective: Plugin<[DirectiveOptions?]> = (options: DirectiveOptions = {}) => {
  return (tree) => {
    visit(tree, ["textDirective", "leafDirective", "containerDirective"], (node: any) => {
      //console.log("generic directive: node.type", node.type);
      if (node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective") {
        const directive = node as Directives;
        //console.log("genericDirective: ", directive);
        const name = directive.name;
        if (!name) return;
        
        const data = node.data || (node.data = {});
        const tagName = node.type === "textDirective" ? "span" : "div";

        data.hName = tagName;
        data.hProperties = h(tagName, node.attributes || {}).properties;

        if (name === "rdfterm" && node.type === "textDirective") {
          if (directive.children.length == 2) {
            console.log("[0]: ", directive.children[0] as Node);
            console.log("[1]: ", directive.children[1] as Node);
            //let tN = directive.children[0] as ;
            const children = [
              {
                type: "text",
                value: directive.children[0].value + ":" + directive.children[1].name,
                position: { start: directive.children[0].position, end: directive.children[1].position },
              },
            ];
            console.log("children: ", children);
            node.children = children;
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

export async function parseMarkdown(content: string, filename: string) {
  if (!filename) console.error("parseMarkdown: No Filename");
  if (!isMarkdownFile(filename)) {
    return;
  }
  const processor = unified()
    .use(remarkParse)
    //.use(html_parser)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkExtractFrontmatter, { yaml: yaml.parse })
    .use(remarkDirective)
    .use(genericDirective)
    .use(remarkDefinitionList)
    .use(remarkGfm)
    .use(remarkFlexibleToc)
    .use(remarkRehype, { allowDangerousHtml: true, allowDangerousCharacters: true })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const processed = await processor.process(content).catch((err) => {
    console.error("Error generating docs:", err);
    process.exit(1);
  });

  return {
    code: String(processed),
    data: processed.data as Record<string, unknown>,
    map: "",
  };
}

export async function getFrontmatter(filePath: string): Promise<Page> {
  const document = await fs.readFile(filePath, "utf-8");
  // Extract frontmatter
  const content = extractFrontmatter(document);
  const meta = content.attributes;

  return {
    content: "", //processed.toString(),
    meta: meta as PageMeta,
  };
}

// Support `.md` and `.svx` extensions
export function isMarkdownFile(filename: string): boolean {
  return filename.endsWith(".md") || filename.endsWith(".svx");
}
