import fg from "fast-glob";
import { parseMarkdown, getFrontmatter } from "../parser/markdown";
import type { ParsedMarkdown, Page, PageMeta, PathConfig } from "../types";
import { getConfig } from "../config/config";

import fs from "node:fs/promises";

async function getPostsInPath(docpath: string, pathConfig?: PathConfig): Promise<ParsedMarkdown[]> {
  console.log("getPostInPath: ", docpath);
  
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();
  
  const files = await fg(filePatterns, {
    cwd: docpath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      console.log("getPostsInPath: ", currentValue);
      const file = await fs.readFile(currentValue[1], "utf-8");
      const parsed = await parseMarkdown(currentValue[1] as string).catch((err) => {
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

export async function getEntries(contentPath: string, pathConfig?: PathConfig) {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();
  
  const files = await fg(filePatterns, {
    cwd: contentPath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      // Use configuration to generate slug
      const slug = config.pathToSlug(currentValue[1]);

      return { slug: slug };
    })
  );

  return posts;
}

export async function getSiteToc(contentPath: string, pathConfig?: PathConfig): Promise<ParsedMarkdown[]> {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();
  
  const files = await fg(filePatterns, {
    cwd: contentPath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      const parsed = await getFrontmatter(currentValue[1] as string).catch((err) => {
        console.error("Error generating Toc:", err);
        process.exit(1);
      });
      
      // Use configuration to generate slug
      parsed.meta.slug = config.pathToSlug(currentValue[1]);
      return parsed;
    })
  );
  
  return posts;
}

export async function getAllSites(path: string, pathConfig?: PathConfig): Promise<ParsedMarkdown[]> {
  return await getPostsInPath(path, pathConfig);
}

export async function getPageBySlug(contentroot: string, slug: string) {
  const _path = contentroot + slug + ".md";
  const content = await fs.readFile(_path, "utf-8");
  const post = await parseMarkdown(content);
  if (post) {
    //post.meta.slug = slug;
    return {
      content: post ? (post.code as string) : "", //processed.toString(),
      meta: post.data,
    };
  }
}
