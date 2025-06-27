import fs from "fs/promises";
import path from "path";
import { parseMarkdown } from "../parser/markdown";
import { parseTypeScriptDocs } from "../parser/tsdoc";
import { parsePythonDocs } from "../parser/pydoc";
import { isMarkdownFile } from "../parser/markdown";
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
        const parsed = await parseMarkdown(file);
        const uuid = parsed.meta.uuid;
        if (uuid) {
          console.log(file)
          index[uuid] = {
            uuid,
            filePath: file,
            type: "markdown",
            title: parsed.meta.title || "",
          };
        }
      } catch (err) {
        console.warn(`Error parsing markdown: ${file}`, err);
      }
    } else if (file.endsWith(".ts")) {
      try {
        const docs = parseTypeScriptDocs(file);
        for (const doc of docs) {
          if (doc.uuid) {
            index[doc.uuid] = {
              uuid: doc.uuid,
              filePath: doc.filePath,
              type: "typescript",
              title: doc.name,
            };
          }
        }
      } catch (err) {
        console.warn(`Error parsing TS: ${file}`, err);
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
