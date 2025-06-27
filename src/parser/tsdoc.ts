//import { Project, SyntaxKind, JSDoc } from "ts-morph";
import path from "path";

export interface ExtractedDoc {
  name: string;
  kind: string;
  documentation: string;
  uuid?: string;
  filePath: string;
}

// function extractUUID(jsDocs: JSDoc[]): string | undefined {
//   for (const doc of jsDocs) {
//     const comment = doc.getComment();
//     if (typeof comment === "string") {
//       const match = comment.match(/uuid\s*[:=]\s*([0-9a-fA-F-]{36})/);
//       if (match) {
//         return match[1];
//       }
//     }
//   }
//   return undefined;
// }

export function parseTypeScriptDocs(filePath: string): ExtractedDoc[] {
  // const project = new Project({
  //   tsConfigFilePath: path.resolve("tsconfig.json"),
  //   skipAddingFilesFromTsConfig: true,
  // });

  // const sourceFile = project.addSourceFileAtPath(filePath);
  // const docs: ExtractedDoc[] = [];

  // sourceFile.forEachChild((node) => {
  //   const symbol = node.getSymbol();
  //   const name = symbol?.getName();
  //   const jsDocs = (node as any).getJsDocs?.() ?? [];

  //   const docText = jsDocs.map((doc: JSDoc) => doc.getComment()).join("\n");
  //   const uuid = extractUUID(jsDocs);

  //   if (name && docText) {
  //     docs.push({
  //       name,
  //       kind: SyntaxKind[node.getKind()],
  //       documentation: docText,
  //       uuid,
  //       filePath,
  //     });
  //   }
  // });

  // return docs;
}
