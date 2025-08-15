import node from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import sucrase from "@rollup/plugin-sucrase";
import dts from "rollup-plugin-dts";
import { readFileSync } from "fs";
import { resolve } from "path";

export default [
  {
    plugins: [
      node({ 
        preferBuiltins: true,
        exportConditions: ['node'], // Add Node.js specific exports
      }), 
      commonjs({
        // Include Node.js builtins
        ignoreDynamicRequires: true,
        transformMixedEsModules: true,
      }), 
      json(), 
      sucrase({ transforms: ["typescript"] })
    ],
    input: "src/main.ts",
    external: ["svelte/compiler"],
    output: {
      file: "./dist/main.js",
      format: "es",
      sourcemap: true,
      // Add Node.js globals
      intro: `
        if (!globalThis.__filename) {
          import('module').then(module => {
            const { createRequire } = module;
            import('url').then(url => {
              const { fileURLToPath } = url;
              import('path').then(path => {
                const require = createRequire(import.meta.url);
                const __filename = fileURLToPath(import.meta.url);
                const __dirname = path.dirname(__filename);
                globalThis.__filename = __filename;
                globalThis.__dirname = __dirname;
                globalThis.require = require;
              });
            });
          });
        }
      `,
    },
  },
  {
    plugins: [dts()],
    input: "src/main.ts",
    output: {
      file: "./dist/main.d.ts",
      format: "es",
    },
  },
];
