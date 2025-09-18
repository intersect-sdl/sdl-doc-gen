import node from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import sucrase from "@rollup/plugin-sucrase";
import dts from "rollup-plugin-dts";

export default [
  {
    plugins: [
      node({ 
        preferBuiltins: true,
      }), 
      commonjs({
        ignoreDynamicRequires: true,
        transformMixedEsModules: true,
        ignore: ['@asamuzakjp/css-color', 'rrweb-cssom', '@csstools/*']
      }), 
      json(), 
      sucrase({ transforms: ["typescript"] })
    ],
    input: "src/main.ts",
    external: (id) => {
      // Don't externalize relative imports (local modules)
      if (id.startsWith('./') || id.startsWith('../')) {
        return false;
      }
      
      // Don't externalize the entry point or main source files
      if (id.includes('src/main.ts') || id.includes('/src/')) {
        return false;
      }
      
      // Externalize Node.js builtins
      if (['fs', 'path', 'node:fs', 'node:path', 'node:fs/promises', 'node:url', 'node:crypto'].includes(id)) {
        return true;
      }
      
      // Externalize EVERYTHING except known safe bundling candidates
      // Only bundle very specific modules that we know are safe
      const safeToBundles = [
        'front-matter', 
        'fast-glob',
        '@types/mdast',
        '@types/unist', 
        '@types/node'
      ];
      
      // If it's in our safe list, don't externalize it
      if (safeToBundles.some(safe => id === safe || id.startsWith(safe + '/'))) {
        return false;
      }
      
      // Externalize everything else that's not a relative import
      return true;
    },
    output: {
      file: "./dist/main.js",
      format: "es",
      sourcemap: true,
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