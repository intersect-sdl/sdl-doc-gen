// plugins/remark-wikiref-patched.ts
import { wikirefFromMarkdown } from "../mdast-util-wikirefs/wikirefsFromMarkdown";
import { syntaxWikiRefs, syntaxWikiLinks } from "micromark-extension-wikirefs";
import { visit } from "unist-util-visit";

let warningIssued: boolean = false;

function remarkWikirefs(this: any, opts = {}) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = /** @type {Processor<Root>} */ this;
    const data = self.data();
    //console.log("remarkWikiRefsPatched: self: ", self);

    if (
      !warningIssued &&
      ((self.Parser && self.Parser.prototype && self.Parser.prototype.blockTokenizers) || (self.Compiler && self.Compiler.prototype && self.Compiler.prototype.visitors))
    ) {
      warningIssued = true;
      console.warn("[remark-wiki-link] Warning: please upgrade to remark 13 to use this plugin");
    }

    //console.log("remarkWikiRefsPatched: data: ", data);

    //add("micromarkExtensions", syntaxWikiLinks(opts));
    //add("fromMarkdownExtensions", fromMarkdownWikiLinks(opts));
    //   add("toMarkdownExtensions", toMarkdownWikiLinks(opts));

    const micromarkExtensions = data.micromarkExtensions || (data.micromarkExtensions = []);
    micromarkExtensions.push(syntaxWikiRefs(opts));

    const fromMarkdownExtensions = data.fromMarkdownExtensions || (data.fromMarkdownExtensions = []);
    fromMarkdownExtensions.push(wikirefFromMarkdown(opts));

    // const toMarkdownExtensions = data.toMarkdownExtensions || (data.toMarkdownExtensions = []);
    // toMarkdownExtensions.push(toMarkdownWikiLinks(opts));

    // console.log("remarkWikiRefsPatched: data: ", data);
    // console.log("remarkWikiRefsPatched: data.micromarkExtensions: ", data.micromarkExtensions);
    // console.log("remarkWikiRefsPatched: data.fromMarkdownExtensions: ", data.fromMarkdownExtensions);
    // console.log("remarkWikiRefsPatched: data.toMarkdownExtensions: ", data.toMarkdownExtensions);
}

export { remarkWikirefs };
export default remarkWikirefs;
