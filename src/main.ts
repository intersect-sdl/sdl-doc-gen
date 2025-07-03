// @ts-ignore
globalThis.global = globalThis;

if (typeof window !== "undefined") {
  // @ts-ignore
  window.global = globalThis;
}

export { getSiteToc, getPageBySlug, getEntries } from './content/loadContent'
export { doc_gen } from "./index";
