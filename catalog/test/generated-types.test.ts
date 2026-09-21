import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

import {
  checkGeneratedTypes,
  writeGeneratedTypes,
} from "../scripts/generate-types.ts";

const sourceSchemaDirectory = new URL("../schema/", import.meta.url);
let temporaryDirectory: string;
let schemaDirectory: string;
let outputDirectory: string;

before(async () => {
  temporaryDirectory = await mkdtemp(join(tmpdir(), "catalog-types-"));
  schemaDirectory = join(temporaryDirectory, "schema");
  outputDirectory = join(temporaryDirectory, "generated");
  await cp(sourceSchemaDirectory, schemaDirectory, { recursive: true });
  await mkdir(outputDirectory, { recursive: true });
});

after(async () => {
  await rm(temporaryDirectory, { force: true, recursive: true });
});

void test("生成结果通过只读比较", async () => {
  const options = { schemaDirectory, outputDirectory };
  await writeGeneratedTypes(options);

  assert.deepEqual(await checkGeneratedTypes(options), []);
});

void test("只读比较发现陈旧内容且不改写文件", async () => {
  const options = { schemaDirectory, outputDirectory };
  await writeGeneratedTypes(options);
  const generatedFile = join(outputDirectory, "benefit.ts");
  await writeFile(generatedFile, "陈旧内容\n", "utf8");

  assert.deepEqual(await checkGeneratedTypes(options), [
    { file: "benefit.ts", reason: "stale" },
  ]);
  assert.equal(await readFile(generatedFile, "utf8"), "陈旧内容\n");
});
