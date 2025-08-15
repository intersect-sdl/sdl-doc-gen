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

function getJSDocDescription(node: Node): string {
  if (node.getKind() !== SyntaxKind.Parameter) {
    return '';
  }

  const parent = node.getParentOrThrow();
  if (!node.getSymbol()) {
    return '';
  }

  // Get all JSDoc comments from the parent
  const jsDocable = parent as Node & { getJsDocs(): JSDoc[] };
  if (!jsDocable.getJsDocs) {
    return '';
  }

  const docs = jsDocable.getJsDocs();
  const paramName = node.getSymbol()!.getName();
  
  // Find all param tags that match this parameter's name
  const paramDocs = docs.flatMap((doc: JSDoc) => 
    doc.getTags()
      .filter((tag: JSDocTag) => tag.getTagName() === 'param')
      .filter((tag: JSDocTag) => {
        const tagText = tag.getText();
        return tagText.startsWith(`@param ${paramName}`) || tagText.startsWith(`@param {`) && tagText.includes(`} ${paramName}`);
      })
      .map((tag: JSDocTag) => tag.getCommentText() || '')
  );

  return paramDocs.filter((text: string): text is string => text !== '').join('\n');
}

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
      // Initialize the tag array if it doesn't exist
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
    // Try to find a @uuid tag first
    const tags = doc.getTags();
    const uuidTag = tags.find((tag: JSDocTag) => tag.getTagName() === "uuid");
    if (uuidTag) {
      return String(uuidTag.getCommentText() || "");
    }

    // If no @uuid tag, try to find a uuid: or uuid= pattern in the comment text
    const comment = doc.getCommentText();
    if (typeof comment === "string") {
      const uuid = extractUUIDFromComment(comment);
      if (uuid) return uuid;
    }

    // Also check the full JSDoc text
    const fullText = doc.getText();
    if (fullText) {
      const uuid = extractUUIDFromComment(fullText);
      if (uuid) return uuid;
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

function extractUUIDFromComment(comment: string): string | undefined {
  // Try matching uuid: or uuid= pattern
  const match = comment.match(/uuid\s*[=:]\s*([0-9a-fA-F-]{36})/i);
  if (match) {
    return match[1];
  }
  return undefined;
}

export function parseTypeScriptDocs(filePath: string): Array<ExtractedDoc> {
  try {
    // Get the directory from the file path for module resolution
    const sourceDir = path.dirname(filePath);

    // Initialize Project with strict mode TypeScript config
    const project = new Project({
      compilerOptions: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.ESNext,
        moduleResolution: ModuleResolutionKind.Bundler,
        strict: true,
        types: []
      }
    });

    const sourceFile = project.addSourceFileAtPath(filePath);
    const docs: ExtractedDoc[] = [];

    // First look for module-level comments at the top of the file
    const fileComments = sourceFile.getLeadingCommentRanges();
    for (const comment of fileComments ?? []) {
      const commentText = comment.getText();
      const uuid = extractUUIDFromComment(commentText);
      if (uuid) {
        docs.push({
          name: path.basename(filePath),
          kind: "file",
          documentation: commentText,
          filePath,
          uuid,
          tags: {}
        });
      }
    }

    // Then process JSDoc comments for all nodes
    sourceFile.forEachDescendant((node: Node) => {
      if (!Node.isJSDocable(node)) return;

      const symbol = node.getSymbol();
      const name = symbol?.getName();
      if (!name) return;

      const jsDocs = node.getJsDocs();
      // Allow nodes without JSDoc if they have leading comments
      const leadingComments = node.getLeadingCommentRanges();
      if (jsDocs.length === 0 && !leadingComments?.length) return;

      // Process JSDoc comments
      const docTexts: string[] = [];
      const exampleBlocks: string[] = [];
      const tags: Record<string, string[]> = {};

      // Also check leading comments for UUIDs
      if (leadingComments) {
        for (const comment of leadingComments) {
          const commentText = comment.getText();
          const uuid = extractUUIDFromComment(commentText);
          if (uuid) {
            tags.uuid = [uuid];
          }
          if (!comment.getText().startsWith('/*')) {
            // Skip single-line comments
            continue;
          }
          docTexts.push(commentText.replace(/^\/\*+\s*|\s*\*+\/$/g, ''));
        }
      }

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

        // Extract tags
        Object.assign(tags, extractTags([doc]));
      }

      const documentation = docTexts.join('\n\n');
      const example = tags.example?.[0];
      const docWithExample = example ? documentation + '\n\n' + example : documentation;
      const extracted: ExtractedDoc = {
        name,
        kind: node.getKindName(),
        documentation: docWithExample,
        filePath,
        tags,
        uuid: tags.uuid?.[0]
      };

      // Extract code info for functions
      if (Node.isFunctionDeclaration(node) || Node.isMethodDeclaration(node)) {
        const parameters = node.getParameters().map(param => ({
          name: param.getName(),
          type: param.getType().getText(),
          description: getJSDocDescription(param)
        }));

        const returnType = node.getReturnType();
        const returnDescription = node.getJsDocs()
          .map(doc => doc.getTags().find(tag => tag.getTagName() === 'returns'))
          .filter(tag => tag)
          .map(tag => tag!.getCommentText())
          .filter(text => text)
          .join('\n');

        extracted.codeInfo = {
          line: node.getStartLineNumber(),
          column: node.getStart() - node.getStartLinePos(),
          parameters,
          returns: {
            type: returnType.getText(),
            description: returnDescription || undefined
          }
        };
      }

      docs.push(extracted);
    });

    return docs;
  } catch (err) {
    console.error('Error parsing TS:', filePath, err);
    return [];
  }
}
