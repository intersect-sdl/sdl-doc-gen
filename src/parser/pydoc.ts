// libs/ssg/src/parser/pydoc.ts
import fs from "fs/promises";

export interface ExtractedPythonDoc {
  name: string;
  uuid?: string;
  docstring: string;
  filePath: string;
}

export async function parsePythonDocs(filePath: string): Promise<ExtractedPythonDoc[]> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const docs: ExtractedPythonDoc[] = [];

  let currentDoc: Partial<ExtractedPythonDoc> = {};
  let insideDoc = false;
  let docLines: string[] = [];

  for (const line of lines) {
    if (/^def\s+(\w+)/.test(line)) {
      if (currentDoc.name && docLines.length) {
        currentDoc.docstring = docLines.join("\n");
        if (currentDoc.uuid && currentDoc.name) {
          docs.push(currentDoc as ExtractedPythonDoc);
        }
      }
      const [, name] = line.match(/^def\s+(\w+)/) || [];
      currentDoc = {
        name,
        filePath,
        uuid: undefined,
        docstring: "",
      };
      insideDoc = false;
      docLines = [];
    } else if (/^\s*"""/.test(line)) {
      insideDoc = !insideDoc;
      if (!insideDoc && currentDoc.name) {
        currentDoc.docstring = docLines.join("\n");
        if (currentDoc.uuid && currentDoc.name) {
          docs.push(currentDoc as ExtractedPythonDoc);
        }
      }
    } else if (insideDoc) {
      docLines.push(line);
      const uuidMatch = line.match(/uuid\s*[:=]\s*([0-9a-fA-F-]{36})/);
      if (uuidMatch) {
        currentDoc.uuid = uuidMatch[1];
      }
    }
  }

  return docs;
}
