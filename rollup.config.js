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
      
      // Externalize Node.js builtins
      if (['fs', 'path', 'node:fs', 'node:path', 'node:fs/promises', 'node:url', 'node:crypto'].includes(id)) {
        return true;
      }
      
      // Externalize specific large dependencies
      if (['unified', 'remark', 'rehype', 'vfile', 'yaml', 'hastscript', 'unist-util-visit'].includes(id)) {
        return true;
      }
      
      // Externalize CSS/PostCSS related packages
      if (id.includes('@csstools') || id.includes('lightningcss') || id.includes('postcss') || id.includes('css-') || id === 'rrweb-cssom') {
        return true;
      }
      
      // Externalize remark/rehype ecosystem
      if (id.startsWith('remark-') || id.startsWith('rehype-') || id.startsWith('mdast-') || 
          id.startsWith('hast-') || id.startsWith('unist-') || id.includes('micromark') || id === 'wikirefs') {
        return true;
      }
      
      return false;
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