// @ts-ignore
globalThis.global = globalThis;

if (typeof window !== "undefined") {
  // @ts-ignore
  window.global = globalThis;
}

export * from "./content/loadContent";
export * from "./index";
