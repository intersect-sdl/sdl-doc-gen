import fg from "fast-glob";
import { parseMarkdown, getFrontmatter } from "../parser/markdown";
import { processBpmnPlaceholders } from "../parser/bpmn-directive";
import type { ParsedMarkdown, Page, PageMeta, PathConfig } from "../types";
import { getConfig } from "../config/config";
import { buildUUIDIndex } from "../link-resolver/uuidIndex";
import { resolveUUIDLinks } from "../link-resolver/resolveUUIDLinks";
import { buildBacklinkIndex } from "../link-resolver/backlinks";

import fs from "node:fs/promises";

async function getPostsInPath(docpath: string, pathConfig?: PathConfig): Promise<ParsedMarkdown[]> {
  //console.log("getPostInPath: ", docpath);
  
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();
  
  const files = await fg(filePatterns, {
    cwd: docpath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      //console.log("getPostsInPath: ", currentValue);
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

// New function to build UUID index
export async function buildUUIDIndexForContent(contentPath: string, cachePath?: string) {
  try {
    const uuidIndex = await buildUUIDIndex(contentPath, cachePath);
    //console.log("UUID Index built successfully:", uuidIndex);
    return uuidIndex;
  } catch (err) {
    console.error("Error building UUID index:", err);
    throw err;
  }
}

export async function getEntries(contentPath: string, pathConfig?: PathConfig) {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();

  // Build UUID index
  const uuidIndex = await buildUUIDIndexForContent(contentPath);

  const files = await fg(filePatterns, {
    cwd: contentPath,
    absolute: true,
  });

  const iterablePostFiles = Object.entries(files);

  let posts = await Promise.all(
    iterablePostFiles.map(async (currentValue) => {
      const slug = config.pathToSlug(currentValue[1]);

      // Include UUID information if available
      const uuidEntry = Object.values(uuidIndex).find(entry => entry.filePath === currentValue[1]);

      return {
        slug: slug,
        uuid: uuidEntry?.uuid || undefined,
      };
    })
  );

  return posts;
}

export async function getSiteToc(contentPath: string, pathConfig?: PathConfig): Promise<ParsedMarkdown[]> {
  const config = getConfig(pathConfig);
  const filePatterns = config.getFilePatterns();

  // Build UUID index
  const uuidIndex = await buildUUIDIndexForContent(contentPath);

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
      
      parsed.meta.slug = config.pathToSlug(currentValue[1]);

      // Include UUID information if available
      const uuidEntry = Object.values(uuidIndex).find(entry => entry.filePath === currentValue[1]);
      parsed.meta.uuid = uuidEntry?.uuid || undefined; // Changed null to undefined for compatibility

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
  const post = await parseMarkdown(content, { baseDir: contentroot });
  if (post) {
        // Process BPMN placeholders to replace them with actual SVG content
    //console.log('[DEBUG] About to process BPMN placeholders...');
    const processedContent = await processBpmnPlaceholders(
      post.code, // HTML content to process
      contentroot // Base directory for resolving BPMN file paths
    );
    //console.log('[DEBUG] BPMN placeholders processing complete.');
    
    return {
      content: processedContent,
      meta: post.data,
    };
  }
}

export async function resolveLinksInContent(contentDir: string, cachePath: string): Promise<void> {
  await resolveUUIDLinks(contentDir, cachePath);
}

export async function trackBacklinks(contentDir: string, outPath?: string): Promise<void> {
  const backlinkIndex = await buildBacklinkIndex(contentDir);

  if (outPath) {
    const { writeBacklinkIndex } = await import("../link-resolver/backlinks");
    await writeBacklinkIndex(backlinkIndex, outPath);
  }
}
