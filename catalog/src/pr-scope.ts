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
  const headRef = process.env.PR_HEAD_REF;
  if (headRef === undefined || headRef === "") {
    throw new Error("缺少 PR_HEAD_REF，无法判断维护分支范围");
  }
  const output = execFileSync(
    "git",
    ["diff", "--no-renames", "--name-only", "-z", "HEAD^1", "HEAD"],
    { encoding: "utf8" },
  );
  const changedPaths = output.split("\0").filter(Boolean);
  const problems = checkCatalogPrScope(changedPaths, headRef);
  if (problems.length > 0) {
    for (const problem of problems) {
      process.stderr.write(`${problem}\n`);
    }
    process.exitCode = 1;
  }
}
