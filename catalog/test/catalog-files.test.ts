import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type { CatalogFile } from "../src/model.ts";
import { validateCatalog } from "../src/validate.ts";

const catalogDirectory = fileURLToPath(new URL("../", import.meta.url));

async function collectFiles(relativePath: string): Promise<CatalogFile[]> {
  const directory = join(catalogDirectory, relativePath);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const files: CatalogFile[] = [];
  for (const entry of entries) {
    const path = join(relativePath, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else {
      files.push({
        path,
        content: await readFile(join(catalogDirectory, path), "utf8"),
      });
    }
  }
  return files;
}

void test("当前目录的数据文件与跨文件引用符合契约", async () => {
  const files = [
    {
      path: "discovery.json",
      content: await readFile(join(catalogDirectory, "discovery.json"), "utf8"),
    },
    ...(await collectFiles("channels")),
    ...(await collectFiles("benefits")),
  ];
  const result = validateCatalog(files);
  assert.ok(
    result.valid,
    result.valid
      ? undefined
      : result.issues
          .map((item) => `${item.file}${item.path}: ${item.message}`)
          .join("\n"),
  );
});
