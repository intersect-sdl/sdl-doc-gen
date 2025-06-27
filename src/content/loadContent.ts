import fg from "fast-glob";
import { parseMarkdown } from "../parser/markdown";
import type { ParsedMarkdown } from "../parser/markdown";

let posts: ParsedMarkdown[];

const basepath = "/app/"

const basename = (path: string) => path.split("/").pop()?.split(".").shift() ?? "";
const filePath = (path: string) => "/" + basename(path);

async function getPostsInPath(docpath: string): Promise<ParsedMarkdown[]> {
  console.log("getPostsInPath: path> ", docpath);
  //  if (!posts) {

  const allfiles = await fg(["**/*.*"], {
    cwd: docpath,
    absolute: true,
  });
  const files = await fg(["**/*.md"], {
    cwd: docpath,
    absolute: true,
  });
  // console.log("getPostsInPath: allfiles>", allfiles);
  // console.log("getPostsInPath: ", files);

  const iterablePostFiles = Object.entries(files);

  posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      //console.log("getPostsInPath: ", currentValue)
      const parsed = await parseMarkdown(currentValue[1] as string);

      parsed.meta.slug = currentValue[1].replace(/\.[^/.]+$/, "").slice(basepath.length);

      // console.log("currentValue: ", currentValue[1])
      // console.log("docpath: ", docpath)
      console.log("parsed.meta.slug: ", parsed.meta.slug)
      // console.log("filePath: ", basename(currentValue[1]))
      return parsed;
    })
  );
  //  }

  return posts;
}

export async function getAllSites(path: string): Promise<ParsedMarkdown[]> {
  return await getPostsInPath(path);
}

export async function getPageBySlug(contentroot: string, slug: string) {
  const _path = contentroot + slug + ".md";
  const post = await parseMarkdown(_path);
  post.meta.slug = slug;
  return post;
}