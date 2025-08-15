import fs from "fs/promises";
import path from "path";
import { parseMarkdownWithFrontmatter, isMarkdownFile } from "../parser/markdown";
import { parseTypeScriptDocs } from "../parser/tsdoc";
import { parsePythonDocs } from "../parser/pydoc";
import fg from "fast-glob";

export interface UUIDEntry {
  uuid: string;
  filePath: string;
  type: "markdown" | "typescript" | "python";
  title?: string;
}

export async function buildUUIDIndex(contentDir: string, outputFile?: string): Promise<Record<string, UUIDEntry>> {
  const index: Record<string, UUIDEntry> = {};

  const files = await fg(["**/*.md", "**/*.svx", "**/*.ts", "**/*.py"], {
    cwd: contentDir,
    absolute: true,
  });

  for (const file of files) {
    if (isMarkdownFile(file)) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const parsed = await parseMarkdownWithFrontmatter(content);
        const uuid = parsed.meta?.uuid;
        if (uuid) {
          index[uuid] = {
            uuid,
            filePath: file,
            type: "markdown",
            title: parsed.meta?.title || "",
          };
        }
      } catch (err) {
        console.warn(`Error parsing markdown: ${file}`, err);
      }
    } else if (file.endsWith(".ts")) {
      try {
        const docs = await parseTypeScriptDocs(file);
        for (const doc of docs) {
          if (doc.uuid) {
            index[doc.uuid] = {
              uuid: doc.uuid,
              filePath: file,
              type: "typescript",
              title: doc.name,
            };
          }
        }
      } catch (err) {
        console.warn(`Error parsing TypeScript: ${file}`, err);
      }
    } else if (file.endsWith(".py")) {
      try {
        const docs = await parsePythonDocs(file);
        for (const doc of docs) {
          if (doc.uuid) {
            index[doc.uuid] = {
              uuid: doc.uuid,
              filePath: doc.filePath,
              type: "python",
              title: doc.name,
            };
          }
        }
      } catch (err) {
        console.warn(`Error parsing Python: ${file}`, err);
      }
    }
  }

  if (outputFile) {
    try {
      await fs.writeFile(outputFile, JSON.stringify(index, null, 2), "utf-8");
    } catch (err) {
      console.error(`Failed to write UUID index cache to ${outputFile}`, err);
    }
  }

  return index;
}
