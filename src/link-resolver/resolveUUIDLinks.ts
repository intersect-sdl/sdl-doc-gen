import fs from "fs/promises";
import path from "path";
import fg from "fast-glob";
import { buildUUIDIndex, type UUIDEntry } from "./uuidIndex";

/**
 * Replace all instances of [[uuid:...]] with relative links to the appropriate file
 */
export async function resolveUUIDLinks(contentDir: string, cachePath: string): Promise<void> {
  const uuidIndex = await buildUUIDIndex(contentDir, cachePath);

  const files = await fg(["**/*.md", "**/*.svx", "**/*.ts", "**/*.py"], {
    cwd: contentDir,
    absolute: true,
  });

  for (const file of files) {
    let content = await fs.readFile(file, "utf-8");

    const updated = content.replace(/\[\[uuid:([0-9a-fA-F-]{36})\]\]/g, (_, uuid: string) => {
      const entry = uuidIndex[uuid];
      if (!entry) return `[[MISSING UUID: ${uuid}]]`;

      let relativePath = path.relative(path.dirname(file), entry.filePath).replace(/\\/g, "/");
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }

      console.log(file, path.dirname(file), entry.filePath);
      return `[${entry.title ?? "Link"}](${relativePath})`;
    });

    if (updated !== content) {
      await fs.writeFile(file, updated, "utf-8");
    }
  }
}
