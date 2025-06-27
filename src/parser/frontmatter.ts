import frontMatter from "front-matter";

export function extractFrontmatter(content: string) {
  return <Record<string, any>>frontMatter(content);
}
