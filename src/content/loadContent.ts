import fg from "fast-glob";
import { parseMarkdown, getFrontmatter } from "../parser/markdown";
import type { ParsedMarkdown, Page, PageMeta } from "../parser/markdown";

import fs from "node:fs/promises";

//let posts: ParsedMarkdown[];

//const basepath = "/Users/x8q/Projects/INTERSECT/ACL";
const basepath = "/app";

const basename = (path: string) => path.split("/").pop()?.split(".").shift() ?? "";
const filePath = (path: string) => "/" + basename(path);

async function getPostsInPath(docpath: string): Promise<ParsedMarkdown[]> {
  console.log("getPostInPath: ", docpath);
  const files = await fg(["**/*.md"], {
    cwd: docpath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      console.log("getPostsInPath: ", currentValue);
      const file = await fs.readFile(currentValue[1], "utf-8");
      const parsed = await parseMarkdown(file, currentValue[1] as string).catch((err) => {
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

export async function getEntries(path: string) {
  //if (!posts) {
  const files = await fg(["**/*.md"], {
    cwd: path,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      // @todo This needs fixing
      const slug = currentValue[1].replace(/\.[^/.]+$/, "").slice(basepath.length + 6)
      console.log("getEntries / slug: ", slug);
      return { slug: slug };
    })
  );

  return posts;
}

export async function getSiteToc(path: string): Promise<ParsedMarkdown[]> {
  //if (!posts) {
  const files = await fg(["**/*.md"], {
    cwd: path,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      console.log("getSiteToc: ", currentValue);
      const parsed = await getFrontmatter(currentValue[1] as string).catch((err) => {
        console.error("Error generating Toc:", err);
        process.exit(1);
      });
      parsed.meta.slug = currentValue[1].replace(/\.[^/.]+$/, "").slice(basepath.length);
      console.log("slug: ", currentValue[1].replace(/\.[^/.]+$/, "").slice(basepath.length));
      return parsed;
    })
  );
  //}

  return posts;
}

export async function getAllSites(path: string): Promise<ParsedMarkdown[]> {
  return await getPostsInPath(path);
}

export async function getPageBySlug(contentroot: string, slug: string) {
  console.log("getPageBySlug: ", contentroot, slug);
  const _path = contentroot + slug + ".md";
  const content = await fs.readFile(_path, "utf-8");
  const post = await parseMarkdown(content, _path);
  if (post) {
    //post.meta.slug = slug;
    return {
      content: post ? (post.code as string) : "", //processed.toString(),
      meta: post.data as PageMeta,
    } as Page;
  }
}
