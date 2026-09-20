import assert from "node:assert/strict";
import { test } from "node:test";

import { checkCatalogPrScope } from "../src/pr-scope.ts";

void test("维护分支只允许渠道、权益和发现入口数据 JSON", () => {
  assert.deepEqual(
    checkCatalogPrScope(
      [
        "catalog/discovery.json",
        "catalog/channels/deepseek-api.json",
        "catalog/benefits/deepseek-api/off-peak.json",
      ],
      "catalog-update/2026-09-20",
    ),
    [],
  );
  const found = checkCatalogPrScope(
    ["catalog/src/validate.ts", ".github/workflows/check.yml"],
    "catalog-update/2026-09-20",
  );
  assert.equal(found.length, 2);
});

void test("任何 PR 都不能混改目录数据与代码，正常工程 PR 不受阻", () => {
  assert.equal(
    checkCatalogPrScope(
      [
        "catalog/benefits/deepseek-api/off-peak.json",
        "catalog/schema/benefit.schema.json",
      ],
      "feature/schema-change",
    ).length,
    1,
  );
  assert.deepEqual(
    checkCatalogPrScope(
      ["catalog/schema/benefit.schema.json"],
      "feature/schema-change",
    ),
    [],
  );
});

void test("删除、重命名和错误扩展名按各自路径受同一规则检查", () => {
  const renamedPaths = [
    "catalog/benefits/deepseek-api/old.json",
    "catalog/benefits/deepseek-api/new.json",
  ];
  assert.deepEqual(
    checkCatalogPrScope(renamedPaths, "catalog-update/rename"),
    [],
  );
  assert.equal(
    checkCatalogPrScope(
      [
        "catalog/benefits/deepseek-api/off-peak.json",
        "catalog/benefits/deepseek-api/note.md",
      ],
      "catalog-update/delete",
    ).length,
    1,
  );
});
