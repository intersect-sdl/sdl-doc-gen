import { 
  Project, 
  SyntaxKind, 
  JSDoc, 
  Node, 
  SourceFile,
  JSDocTag,
  ScriptTarget,
  ModuleKind,
  ModuleResolutionKind
} from "ts-morph";
import path from "path";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkDirective from "remark-directive";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";

export interface ExtractedDoc {
  name: string;
  kind: string;
  documentation: string;
  uuid?: string;
  filePath: string;
  tags: Record<string, string[]>;
  codeInfo?: {
    line: number;
    column: number;
    parameters?: Array<{ name: string; type: string; description?: string }>;
    returns?: { type: string; description?: string };
  };
}

function extractTags(jsDocs: JSDoc[]): Record<string, string[]> {
  const tags: Record<string, string[]> = {};
  for (const doc of jsDocs) {
    const tagNodes = doc.getTags();
    for (const tag of tagNodes) {
      const tagName = tag.getTagName();
      const tagText = String(tag.getCommentText() || "");
      if (!tags[tagName]) {
        tags[tagName] = [];
      }
      tags[tagName].push(tagText);
    }
  }
  return tags;
}

function extractUUID(jsDocs: JSDoc[]): string | undefined {
  for (const doc of jsDocs) {
    const tags = doc.getTags();
    const uuidTag = tags.find((tag: JSDocTag) => tag.getTagName() === "uuid");
    if (uuidTag) {
      return String(uuidTag.getCommentText() || "");
    }
    const comment = doc.getCommentText();
    if (typeof comment === "string") {
      const match = comment.match(/uuid\s*[:=]\s*([0-9a-fA-F-]{36})/);
      if (match) {
        return match[1];
      }
    }
  }
  return undefined;
}

function processJSDoc(doc: string): string {
  try {
    // Parse the document
    const tree = unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkGfm)
      .parse(doc);

    // Convert to mdast
    return doc;
  } catch (error) {
    // If parsing fails, return original text
    return doc;
  }
}

function getCodeInfo(node: Node): ExtractedDoc['codeInfo'] {
  const pos = node.getPos();
  const sourceFile = node.getSourceFile();
  const { line, column } = sourceFile.getLineAndColumnAtPos(pos);
  
  const info: ExtractedDoc['codeInfo'] = { line, column };

  if (Node.isMethodDeclaration(node) || Node.isFunctionDeclaration(node)) {
    const paramDocs = new Map<string, string>();
    
    // Extract parameter descriptions from JSDoc tags
    if (Node.isJSDocable(node)) {
      node.getJsDocs().forEach(doc => {
        doc.getTags().forEach(tag => {
          if (tag.getTagName() === 'param') {
            const paramTag = tag as any; // Cast to access getName()
            if (paramTag.getName) {
              const paramName = paramTag.getName();
              const description = paramTag.getCommentText();
              if (paramName && description) {
                paramDocs.set(paramName, description);
              }
            }
          }
        });
      });
    }

    info.parameters = node.getParameters().map(param => ({
      name: param.getName(),
      type: param.getType().getText(),
      description: paramDocs.get(param.getName())
    }));

    const returnType = node.getReturnType();
    if (returnType) {
      let returnDescription: string | undefined;
      if (Node.isJSDocable(node)) {
        const returnTag = node.getJsDocs()
          ?.flatMap(doc => doc.getTags())
          .find((tag): tag is JSDocTag => 
            tag.getTagName() === 'returns' || tag.getTagName() === 'return'
          );
        returnDescription = returnTag?.getCommentText();
      }

      info.returns = {
        type: returnType.getText(),
        description: returnDescription
      };
    }
  }

  return info;
}

export function parseTypeScriptDocs(filePath: string): ExtractedDoc[] {
  const sourceDir = path.dirname(filePath);
  const project = new Project({
    compilerOptions: {
      target: ScriptTarget.ESNext,
      module: ModuleKind.ESNext,
      moduleResolution: ModuleResolutionKind.Bundler,
      skipLibCheck: true,
      strict: true,
      types: []
    }
  });

  const sourceFile = project.addSourceFileAtPath(path.join(sourceDir, 'test.ts'));
  const docs: ExtractedDoc[] = [];

  sourceFile.forEachDescendant((node: Node) => {
    if (!Node.isJSDocable(node)) return;

    const symbol = node.getSymbol();
    const name = symbol?.getName();
    if (!name) return;

    const jsDocs = node.getJsDocs();
    if (jsDocs.length === 0) return;

    // Process JSDoc comments
    const docTexts: string[] = [];
    const exampleBlocks: string[] = [];
    const tags: Record<string, string[]> = {};

    for (const doc of jsDocs) {
      // Process main comment text
      const fullText = doc.getCommentText() || "";
      const mainText = fullText.split('\n')
        .filter(line => !line.trim().startsWith('@'))
        .join('\n')
        .trim();
      
      if (mainText) {
        docTexts.push(mainText);
      }

      // Process tags
      for (const tag of doc.getTags()) {
        const tagName = tag.getTagName();
        const tagText = String(tag.getCommentText() || "").trim();
        
        if (!tags[tagName]) {
          tags[tagName] = [];
        }

        if (tagName === 'example') {
          // Preserve code blocks in examples
          exampleBlocks.push(tagText);
          tags[tagName].push(tagText);
        } else {
          tags[tagName].push(tagText);
        }
      }
    }

    const docText = docTexts.join('\n\n');
    if (!docText && !exampleBlocks.length) return;

    // Combine main documentation with example blocks
    let fullDoc = docText;
    if (exampleBlocks.length > 0) {
      fullDoc = [docText, ...exampleBlocks].join('\n\n');
    }

    const uuid = extractUUID(jsDocs);
    const processedDoc = processJSDoc(fullDoc);
    const codeInfo = getCodeInfo(node);

    docs.push({
      name,
      kind: SyntaxKind[node.getKind()],
      documentation: processedDoc || docText, // Fallback to original text if processing fails
      uuid,
      filePath,
      tags,
      codeInfo
    });
  });

  return docs;
}
