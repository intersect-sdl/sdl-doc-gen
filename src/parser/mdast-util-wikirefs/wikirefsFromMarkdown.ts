import { Directives, LeafDirective, TextDirective, ToMarkdownOptions } from "mdast-util-directive";
import { WikiLinkData, WikiEmbedData } from "micromark-extension-wikirefs";
import { WikiLinkNode, WikiEmbedNode, WikiAttrNode } from "mdast-util-wikirefs";

import { CompileContext, Extension as FromMarkdownExtension, Handle as FromMarkdownHandle, Token } from "mdast-util-from-markdown";
import { ConstructName, Handle as ToMarkdownHandle, Options as ToMarkdownExtension, State } from "mdast-util-to-markdown";
import { Nodes, Paragraph } from "mdast";

import * as wikirefs from "wikirefs";

/**
 * Union of registered mdast wikiref nodes.
 *
 * It is not possible to register custom mdast directive node types.
 */
export type WikiRef = WikiLinkNode | WikiEmbedNode | WikiAttrNode;

let opts = {};
/**
 * Create an extension for `mdast-util-from-markdown` to enable directives in
 * markdown.
 *
 * @returns {FromMarkdownExtension}
 *   Extension for `mdast-util-from-markdown` to enable directives.
 */
export function wikirefFromMarkdown(options = {}): FromMarkdownExtension {
    opts = options;
    return {
        enter: {
            wikiLink: enterWikiLink,
        },
        exit: {
            wikiLinkTypeTxt: exitLinkTypeTxt,
            wikiLinkFileNameTxt: exitFileNameTxt,
            wikiLinkLabelTxt: exitLabelTxt,
            wikiLinkName: exitName,
            wikiLink: exitWikilink,
        },
    };
}

    function top<T>(stack: T[]): T {
    return stack[stack.length - 1];
    }

function exitWikilink(this: CompileContext, token: Token) {
  const node = top(this.stack);

  let htmlText: string | undefined = wikirefs.CONST.MARKER.OPEN + node.name + wikirefs.CONST.MARKER.TYPE;
  node.data.item.htmlHref = "/docs";
  node.data.item.htmlText = "htmlText";
  node.data.item.doctype = "";
  node.data.hProperties.href = "/docs";
  node.data.hProperties.dataHref = "/docs";
  node.children = [
    {
      type: "text",
      value: node.name,
    },
  ];
  //console.log("exitWikilink:\n\ttoken: ", token, "\n\tnode: ", node);
  this.exit(token);
}

function exitName(token: Token): void {
  const node = top(this.stack);
  if (node.type !== "wikiLink") {
    throw new Error("Expected 'wikiLink' node type, got: " + node.type);
  }
  const name = this.sliceSerialize(token);
  node.name = name;
  //console.log("exitName: token: ", token, "name: ", name);
}

/**
 * @this {CompileContext}
 * @param {WikiRef['type']} type
 * @param {Token} token
 */
function enter(this: CompileContext, token: Token, type: WikiRef["type"]) {
  this.enter(
    {
      type,
      name: "",
      attributes: {},
      children: [],
      data: {
        item: { label: "" },
        hName: "a",
        hProperties: {
          className: ["wikilink"],
        },
      },
    },
    token
  );
}

function exitLinkTypeTxt(this: CompileContext, token: Token): void {
  //console.log("exitLinkTypeTxt: token: ", token);
}

function exitFileNameTxt(this: CompileContext, token: Token): void {
  const node = this.stack[this.stack.length - 1];
  const filename: string = this.sliceSerialize(token);
  node.name = filename;
  node.data.item.filename = filename;
  //console.log("exitFileNameTxt: token: ", token, "\nnode: ", node);
}

function exitLabelTxt(this: CompileContext, token: Token): void {
  //console.log("exitLabelTxt: token: ", token);
}

function enterWikiLink(this: CompileContext, token: Token) {
  this.enter(
    {
      type: "wikiLink",
      name: "",
      attributes: {},
      children: [],
      data: {
        item: { label: "" },
        hName: "a",
        hProperties: {
          className: ["wikilink"],
        },
      },
    },
    token
  );
}
