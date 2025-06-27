// libs/ssg/src/link-resolver/backlinks.ts
import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";

interface BacklinkIndex {
  [targetUUID: string]: {
    count: number;
    sources: string[];
  };
}

/**
 * Builds a backlink index mapping target UUIDs to their referencing file paths
 */
export async function buildBacklinkIndex(contentDir: string): Promise<BacklinkIndex> {
  const files = await fg(["**/*.{md,svx,ts,py}"], {
    cwd: contentDir,
    absolute: true,
  });

  const backlinks: BacklinkIndex = {};

  for (const file of files) {
    const content = await fs.readFile(file, "utf-8");
    const matches = [...content.matchAll(/\[\[uuid:([0-9a-fA-F-]{36})\]\]/g)];

    for (const match of matches) {
      const uuid = match[1];
      if (!backlinks[uuid]) {
        backlinks[uuid] = { count: 0, sources: [] };
      }
      backlinks[uuid].count++;
      backlinks[uuid].sources.push(file);
    }
  }

  return backlinks;
}

/**
 * Optionally persist backlink index to disk for analysis or build tasks
 */
export async function writeBacklinkIndex(index: BacklinkIndex, outPath: string): Promise<void> {
  await fs.writeFile(outPath, JSON.stringify(index, null, 2), "utf-8");
}
