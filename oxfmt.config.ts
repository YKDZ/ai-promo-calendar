import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: ["catalog/src/generated/**"],
  printWidth: 80,
  sortImports: true,
});
