import { defineConfig } from 'vite';
import dts from "vite-plugin-dts";

export default defineConfig({
  build: {
    lib: {
      entry: ["src/index.ts"],
      name: "doc-gen",
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format}.js`,
    },
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      external: ["fs", "fs/promises", "path", "url", "fast-glob", "front-matter", "ts-morph", "@mdx-js/mdx", "remark-directive", "remark-frontmatter"],
    },
  },
  plugins: [dts({ outDir: "dist", include: ["src"] })],
});