import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const maintenanceBranchPrefix = "catalog-update/";

const channelDataPath = /^catalog\/channels\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const benefitDataPath =
  /^catalog\/benefits\/[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;

function isCatalogDataPath(path: string): boolean {
  return (
    path === "catalog/discovery.json" ||
    channelDataPath.test(path) ||
    benefitDataPath.test(path)
  );
}

function gitPaths(args: readonly string[]): string[] {
  const output = execFileSync("git", args, { encoding: "utf8" });
  return output.split("\0").filter(Boolean);
}

export function checkCatalogPrScope(
  changedPaths: readonly string[],
  headRef: string,
): string[] {
  const dataPaths = changedPaths.filter(isCatalogDataPath);
  const otherPaths = changedPaths.filter((path) => !isCatalogDataPath(path));
  if (otherPaths.length === 0) return [];

  if (headRef.startsWith(maintenanceBranchPrefix)) {
    return otherPaths.map(
      (path) => `维护分支只能修改目录数据 JSON，越界文件：${path}`,
    );
  }
  if (dataPaths.length > 0) {
    return otherPaths.map(
      (path) => `目录数据与非数据文件必须拆分 PR，混入文件：${path}`,
    );
  }
  return [];
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const headRef = process.env.CATALOG_HEAD_REF;
  if (headRef === undefined || headRef === "") {
    throw new Error("缺少 CATALOG_HEAD_REF，无法判断目录改动范围");
  }
  const baseRef = process.env.CATALOG_SCOPE_BASE;
  const changedPaths = new Set(
    baseRef === undefined || baseRef === ""
      ? gitPaths([
          "diff",
          "--no-renames",
          "--name-only",
          "-z",
          "HEAD^1",
          "HEAD",
        ])
      : gitPaths([
          "diff",
          "--no-renames",
          "--name-only",
          "-z",
          `${baseRef}...HEAD`,
        ]),
  );
  if (process.env.CATALOG_SCOPE_INCLUDE_WORKTREE === "true") {
    for (const path of gitPaths([
      "diff",
      "--no-renames",
      "--name-only",
      "-z",
    ])) {
      changedPaths.add(path);
    }
    for (const path of gitPaths([
      "diff",
      "--cached",
      "--no-renames",
      "--name-only",
      "-z",
    ])) {
      changedPaths.add(path);
    }
    for (const path of gitPaths([
      "ls-files",
      "--others",
      "--exclude-standard",
      "-z",
    ])) {
      changedPaths.add(path);
    }
  }
  const problems = checkCatalogPrScope([...changedPaths], headRef);
  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`${problem}\n`);
    }
    process.exitCode = 1;
  }
}
