import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  compile,
  type JSONSchema,
  type Options,
} from "json-schema-to-typescript";

type ModuleDefinition = {
  schemaFile: string;
  outputFile: string;
  rootName: string;
};

export type GeneratedTypesOptions = {
  schemaDirectory: string;
  outputDirectory: string;
};

export type GeneratedTypesMismatch = {
  file: string;
  reason: "missing" | "stale" | "unexpected";
};

const modules: readonly ModuleDefinition[] = [
  {
    schemaFile: "benefit.schema.json",
    outputFile: "benefit.ts",
    rootName: "TimedBenefit",
  },
  {
    schemaFile: "channel.schema.json",
    outputFile: "channel.ts",
    rootName: "ChannelRecord",
  },
  {
    schemaFile: "discovery.schema.json",
    outputFile: "discovery.ts",
    rootName: "DiscoveryCatalog",
  },
];

const bannerComment = `/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */`;

function isJsonSchema(value: unknown): value is JSONSchema {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function generationOptions(schemaDirectory: string): Partial<Options> {
  return {
    additionalProperties: false,
    bannerComment,
    cwd: schemaDirectory,
    enableConstEnums: false,
    format: true,
    unknownAny: true,
    unreachableDefinitions: true,
  };
}

function adaptDraftSevenDefinitions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(adaptDraftSevenDefinitions);
  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      // 条件约束仍由原始 Schema 和 Ajv 执行；生成投影只省略 TypeScript
      // 无法忠实表达的分支，不得反向修改权威 Schema。
      if (key === "allOf" && Array.isArray(child)) {
        const structuralBranches = child.filter(
          (branch) =>
            branch === null ||
            typeof branch !== "object" ||
            !("if" in branch || "then" in branch || "else" in branch),
        );
        return structuralBranches.length === 0
          ? []
          : [[key, adaptDraftSevenDefinitions(structuralBranches)]];
      }
      if (
        key === "dependencies" ||
        key === "else" ||
        key === "if" ||
        key === "not" ||
        key === "then"
      ) {
        return [];
      }
      const adaptedKey = key === "$defs" ? "definitions" : key;
      const adaptedValue =
        key === "$ref" && typeof child === "string"
          ? child.replace(/^#\/\$defs\//, "#/definitions/")
          : adaptDraftSevenDefinitions(child);
      return [[adaptedKey, adaptedValue]];
    }),
  );
}

function hasErrorCode(error: unknown, code: string): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}

function inlineRootReference(schema: JSONSchema): JSONSchema {
  const reference = schema.$ref;
  const match =
    typeof reference === "string"
      ? /^#\/definitions\/([^/]+)$/.exec(reference)
      : null;
  if (match === null) return schema;

  const definition = schema.definitions?.[match[1]!];
  if (definition === undefined || typeof definition === "boolean") {
    return schema;
  }
  const definitions = { ...schema.definitions };
  delete definitions[match[1]!];
  const { $ref: _reference, ...root } = schema;
  return { ...root, ...definition, definitions, title: schema.title };
}

async function compileModule(
  definition: ModuleDefinition,
  schemaDirectory: string,
): Promise<string> {
  const schemaPath = join(schemaDirectory, definition.schemaFile);
  const parsed = adaptDraftSevenDefinitions(
    JSON.parse(await readFile(schemaPath, "utf8")),
  );
  if (!isJsonSchema(parsed)) {
    throw new Error(`${definition.schemaFile} 的根节点必须是 JSON 对象`);
  }
  const schema = inlineRootReference({
    ...parsed,
    title: definition.rootName,
  });
  return compile(
    schema,
    definition.rootName,
    generationOptions(schemaDirectory),
  );
}

export async function buildGeneratedTypes(
  schemaDirectory: string,
): Promise<ReadonlyMap<string, string>> {
  const entries = await Promise.all(
    modules.map(
      async (definition) =>
        [
          definition.outputFile,
          await compileModule(definition, schemaDirectory),
        ] as const,
    ),
  );
  return new Map(entries);
}

async function generatedTypeFiles(outputDirectory: string): Promise<string[]> {
  try {
    return (await readdir(outputDirectory)).filter((file) =>
      file.endsWith(".ts"),
    );
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return [];
    throw error;
  }
}

export async function writeGeneratedTypes(
  options: GeneratedTypesOptions,
): Promise<void> {
  const generated = await buildGeneratedTypes(options.schemaDirectory);
  await mkdir(options.outputDirectory, { recursive: true });
  await Promise.all(
    [...generated].map(async ([file, content]) => {
      const outputPath = join(options.outputDirectory, file);
      await writeFile(outputPath, content, { encoding: "utf8", flag: "w" });
    }),
  );

  const expected = new Set(generated.keys());
  const unexpected = (await generatedTypeFiles(options.outputDirectory)).filter(
    (file) => !expected.has(file),
  );
  await Promise.all(
    unexpected.map((file) => unlink(join(options.outputDirectory, file))),
  );
}

export async function checkGeneratedTypes(
  options: GeneratedTypesOptions,
): Promise<GeneratedTypesMismatch[]> {
  const generated = await buildGeneratedTypes(options.schemaDirectory);
  const mismatches: GeneratedTypesMismatch[] = [];

  await Promise.all(
    [...generated].map(async ([file, expected]) => {
      try {
        const actual = await readFile(
          join(options.outputDirectory, file),
          "utf8",
        );
        if (actual !== expected) mismatches.push({ file, reason: "stale" });
      } catch (error) {
        if (hasErrorCode(error, "ENOENT")) {
          mismatches.push({ file, reason: "missing" });
          return;
        }
        throw error;
      }
    }),
  );

  const expectedFiles = new Set(generated.keys());
  for (const file of await generatedTypeFiles(options.outputDirectory)) {
    if (!expectedFiles.has(file))
      mismatches.push({ file, reason: "unexpected" });
  }

  return mismatches.toSorted((left, right) =>
    left.file.localeCompare(right.file),
  );
}

async function main(): Promise<void> {
  const catalogDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
  const options = {
    schemaDirectory: join(catalogDirectory, "schema"),
    outputDirectory: join(catalogDirectory, "src", "generated"),
  } satisfies GeneratedTypesOptions;
  const commandArguments = process.argv.slice(2);

  if (commandArguments.length === 0) {
    await writeGeneratedTypes(options);
    return;
  }
  if (commandArguments.length !== 1 || commandArguments[0] !== "--check") {
    throw new Error("用法：generate-types.ts [--check]");
  }

  const mismatches = await checkGeneratedTypes(options);
  if (mismatches.length === 0) return;
  for (const mismatch of mismatches) {
    console.error(`${mismatch.file}: ${mismatch.reason}`);
  }
  process.exitCode = 1;
}

const entryPath = process.argv[1];
if (
  entryPath !== undefined &&
  import.meta.url === pathToFileURL(entryPath).href
) {
  await main();
}
