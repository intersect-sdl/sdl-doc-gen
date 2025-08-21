/**
 * @import {} from 'mdast-util-directive'
 * @import {} from 'mdast-util-to-hast'
 * @import {Root} from 'mdast'
 * @import {Plugin} from 'unified'
 */

import fs from "node:fs/promises";
import path from "path";
import { extractFrontmatter } from "./frontmatter";

import yaml from "yaml";
import { unified } from "unified";

import { h } from "hastscript";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Directives } from "mdast-util-directive";

/* Remark Plugins */
import remarkParse from "remark-parse";
import remarkFrontmatter from "remark-frontmatter";
import remarkExtractFrontmatter from "remark-extract-frontmatter";
import { remarkDefinitionList, defListHastHandlers } from "remark-definition-list";
import sectionize from "remark-sectionize";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import remarkFlexibleToc from "remark-flexible-toc";
import remarkWikiRefsPatched from './remark-wikirefs/remark-wikirefs';
import * as wikirefs from "wikirefs";
// import { bpmnDirective } from './bpmn-directive.js';  // Temporarily disabled for integration testing


import remarkRehype from "remark-rehype";

import rehypeStringify from "rehype-stringify";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

import type { ParsedMarkdown, Page, PageMeta } from "../types";

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
      // console.log("generic directive: node.type", node.type);
      if (node.type === "containerDirective" || node.type === "leafDirective" || node.type === "textDirective") {
        const directive = node as Directives;
        //console.log("genericDirective: ", directive);
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
            const firstChild = directive.children[0] as any;
            const secondChild = directive.children[1] as any;
            
            if (firstChild?.value && secondChild?.name) {
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

let wikiRefOpts = {
    resolveDocType: (fname: string) => {
    console.log("resolveDocType: ", fname);
  },
  resolveHtmlHref: (fname: string) => {
    
    console.log("resolveHtmlHref: ", fname);
    const extname: string = wikirefs.isMedia(fname) ? path.extname(fname) : "";
    fname = fname.replace(extname, "");
    return (
      "/" +
      fname
        .trim()
        .toLowerCase()
        .replace(/ /g, "-")
        .replace(/[^\w-]+/g, "") +
      extname
    );
  },
  resolveHtmlText: (fname: string) => {
    console.log("resolveHtmlText: ", fname)
    fname.replace(/-/g, " ")
  },
  // requires mdast version -- resolves to node, not a string
  resolveEmbedContent: (fname: string) => {
    console.log("resolveEmbedContent: ", fname);
    return {
      type: "text",
      value: fname + " embed content",
    };
  },
  baseUrl: "/docs/user",
};

export async function parseMarkdown(content: string) {
  const processor = unified()
    .use(remarkParse)
    //.use(html_parser)
    .use(remarkFrontmatter, ["yaml"])
    .use(remarkExtractFrontmatter, { yaml: yaml.parse })
    .use(remarkWikiRefsPatched, {baseUrl: "/docs/"})
    .use(sectionize)
    .use(remarkDirective)
    // .use(bpmnDirective, {  // Temporarily disabled for integration testing
    //   baseDir: process.cwd(),
    //   errorFallback: true,
    //   enableCache: true
    // })
    .use(genericDirective)
    .use(remarkDefinitionList)
    .use(remarkGfm)
    .use(remarkFlexibleToc)
    .use(remarkRehype, { allowDangerousHtml: true, allowDangerousCharacters: true, handlers: { ...defListHastHandlers } })
    .use(remarkRehype)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, { behavior: "wrap" })
    .use(rehypeStringify, { allowDangerousHtml: true });

  const processed = processor.processSync(content);
  // const processed = await processor.process(content).catch((err) => {
  //   console.error("Error generating docs:", err);
  //   //process.exit(1);
  // });
  //console.log("Processed Markdown: ", processed);
  return { code: String(processed.value), data: processed.data };
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

// Support `.md`, `.svx`, and `.mdx` extensions
export function isMarkdownFile(filename: string): boolean {
  return filename.endsWith(".md") || filename.endsWith(".svx") || filename.endsWith(".mdx");
}

export async function parseMarkdownWithFrontmatter(content: string): Promise<{ html: string; meta: Record<string, any> }> {
  const { attributes, body } = extractFrontmatter(content);
  const processed = await parseMarkdown(body);
  return {
    html: processed.code,
    meta: attributes
  };
}
