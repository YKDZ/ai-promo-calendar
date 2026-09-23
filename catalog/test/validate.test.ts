import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CatalogFile,
  ChannelRecord,
  DiscoveryCatalog,
  TimedBenefit,
} from "../src/model.ts";
import { validateCatalog } from "../src/validate.ts";

const channel: ChannelRecord = {
  $schema: "../schema/channel.schema.json",
  schemaVersion: 1,
  billingProvider: "示例计费方",
  accessChannel: { id: "example-plan", name: "示例套餐", kind: "plan" },
  sourceReferences: ["https://example.test/plan"],
  billingDecisionInstant: {
    kind: "server_received",
    description: "以服务端接收请求时刻判价",
    sourceReferences: ["https://example.test/billing"],
  },
};

const benefit: TimedBenefit = {
  $schema: "../../schema/benefit.schema.json",
  schemaVersion: 1,
  accessChannelId: "example-plan",
  id: "night-credits",
  title: "测试用夜间积分系数",
  evidenceStatus: "supported",
  sourceReferences: ["https://example.test/pricing"],
  eligibilityConditions: [
    { kind: "one_of", field: "model", values: ["model-a"] },
    { kind: "text", description: "须先领取活动资格" },
  ],
  timeTrigger: { kind: "model_request" },
  timeCondition: {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
    sourceTimeZoneText: "北京时间",
    windows: [
      { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "22:00", end: "08:00" },
    ],
    calendarExceptions: {
      coveredYears: [2026],
      overrides: [{ date: "2026-10-01", windows: [] }],
      sourceReferences: ["https://example.test/calendar"],
    },
  },
  effect: {
    kind: "multiplier",
    target: "credits",
    unit: "模型调用积分",
    value: "0.5",
  },
};

const discovery: DiscoveryCatalog = {
  $schema: "schema/discovery.schema.json",
  schemaVersion: 1,
  entries: [
    {
      title: "示例文档",
      url: "https://example.test/docs",
      description: "只作调查入口",
    },
  ],
};

function file(path: string, value: unknown): CatalogFile {
  return { path, content: JSON.stringify(value) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function record(value: unknown): Record<string, unknown> {
  assert.ok(isRecord(value));
  return value;
}

function snapshot(): CatalogFile[] {
  return [
    file("discovery.json", discovery),
    file("channels/example-plan.json", channel),
    file("benefits/example-plan/night-credits.json", benefit),
  ];
}

function messages(files: CatalogFile[]): string[] {
  const result = validateCatalog(files);
  return result.valid
    ? []
    : result.issues.map((item) => `${item.file}${item.path}: ${item.message}`);
}

void test("接受独立权益、跨午夜窗口与零权益渠道", () => {
  const files = snapshot();
  const result = validateCatalog(files);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.equal(result.catalog.benefits.length, 1);

  const withoutBenefit = files.filter(
    (item) => !item.path.startsWith("benefits/"),
  );
  assert.equal(validateCatalog(withoutBenefit).valid, true);

  const quotaBenefit = structuredClone(benefit);
  quotaBenefit.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "额外试用额度",
        measure: { kind: "quota", unit: "次" },
        per: "活动期",
        regular: "0",
        benefit: "100",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", quotaBenefit);
  assert.equal(validateCatalog(files).valid, true);
});

void test("兼容旧目录时也接受无叙述字段的新版权益", () => {
  const files = snapshot();
  const next = record(structuredClone(benefit));
  next.schemaVersion = 2;
  delete next.title;
  next.eligibilityConditions = [
    { kind: "one_of", field: "model", values: ["model-a"] },
  ];
  next.timeCondition = {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
    windows: [
      { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "22:00", end: "08:00" },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);

  assert.equal(validateCatalog(files).valid, true);
});

void test("新版渠道保留判定时刻来源而不保存解释句", () => {
  const files = snapshot();
  const next = record(structuredClone(channel));
  next.schemaVersion = 2;
  const decision = record(next.billingDecisionInstant);
  delete decision.description;
  files[1] = file("channels/example-plan.json", next);
  assert.equal(validateCatalog(files).valid, true);

  decision.description = "以服务端接收请求时刻判价";
  files[1] = file("channels/example-plan.json", next);
  assert.equal(validateCatalog(files).valid, false);
});

void test("优惠单价已知而通常价未知时保留优惠值", () => {
  const files = snapshot();
  const next = record(structuredClone(benefit));
  next.schemaVersion = 2;
  delete next.title;
  next.eligibilityConditions = [];
  next.timeCondition = { kind: "unresolved" };
  next.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "输入",
        measure: { kind: "money", currency: "CNY" },
        per: "百万 tokens",
        benefit: "1",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);

  const result = validateCatalog(files);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.equal(result.catalog.benefits[0]?.effect.kind, "unit_rate");
});

void test("保留无时区的已知政策日期并拒绝无效日期", () => {
  const files = snapshot();
  const next = record(structuredClone(benefit));
  next.schemaVersion = 2;
  delete next.title;
  next.eligibilityConditions = [];
  next.timeTrigger = { kind: "subscription_order" };
  next.timeCondition = {
    kind: "unresolved",
    knownBoundaries: [{ role: "start", date: "2026-08-05", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.timeCondition = {
    kind: "unresolved",
    knownBoundaries: [{ role: "start", date: "2026-02-30", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("边界日期无效")),
  );

  next.timeCondition = {
    kind: "unresolved",
    knownBoundaries: [
      { role: "start", date: "2026-08-05", timeZone: null },
      { role: "start", date: "2026-08-06", timeZone: null },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("边界角色重复")),
  );

  next.timeCondition = {
    kind: "unresolved",
    knownBoundaries: [
      { role: "start", date: "2026-09-01", timeZone: null },
      { role: "end", date: "2026-08-31", timeZone: null },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("结束日期早于开始")),
  );
});

void test("新版记录保留局部不确定而无需解释句", () => {
  const files = snapshot();
  const next = record(structuredClone(benefit));
  next.schemaVersion = 2;
  delete next.title;
  next.evidenceStatus = "uncertain";
  next.eligibilityConditions = [
    {
      kind: "one_of",
      field: "plan_tier",
      values: ["Pro"],
      uncertainValues: ["Ultra"],
    },
  ];
  next.timeTrigger = { kind: "claim" };
  next.timeCondition = {
    kind: "absolute",
    startsAt: "2026-09-01T10:00:00+08:00",
    endsAt: "2026-09-30T23:59:00+08:00",
    endInclusive: null,
    endPrecision: "minute",
  };
  next.effect = { kind: "unresolved" };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  const condition = record(next.timeCondition);
  delete condition.endPrecision;
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, false);
});

void test("证据不确定与不可求值是独立维度", () => {
  const files = snapshot();
  const uncertain: TimedBenefit = {
    ...benefit,
    evidenceStatus: "uncertain",
    uncertaintyReason: "两个官方页面对活动是否仍有效的说法冲突",
    timeCondition: {
      kind: "unresolved",
      publishedText: "每天夜间，未说明时区",
      reason: "无法确定对应的 UTC 时刻",
    },
    effect: {
      kind: "unresolved",
      publishedText: "夜间加量",
      reason: "未公布加量数值",
    },
  };
  files[2] = file("benefits/example-plan/night-credits.json", uncertain);
  assert.equal(validateCatalog(files).valid, true);

  const missingReason = record(structuredClone(uncertain));
  delete missingReason.uncertaintyReason;
  files[2] = file("benefits/example-plan/night-credits.json", missingReason);
  assert.ok(
    messages(files).some((message) =>
      message.includes("night-credits.json/uncertaintyReason"),
    ),
  );
});

void test("拒绝未声明时间触发事件的权益", () => {
  const files = snapshot();
  const missingTimeTrigger = record(structuredClone(benefit));
  delete missingTimeTrigger.timeTrigger;
  files[2] = file(
    "benefits/example-plan/night-credits.json",
    missingTimeTrigger,
  );

  assert.ok(
    messages(files).some((message) =>
      message.includes("night-credits.json/timeTrigger"),
    ),
  );
});

void test("接受日期精度的重复规则与仅结束边界待核实的活动", () => {
  const files = snapshot();
  const dateOnlyStart = structuredClone(benefit);
  if (dateOnlyStart.timeCondition.kind !== "recurring") assert.fail();
  dateOnlyStart.timeCondition.validFromDate = "2026-06-23";
  dateOnlyStart.timeTrigger = { kind: "model_request" };
  files[2] = file("benefits/example-plan/night-credits.json", dateOnlyStart);
  assert.equal(validateCatalog(files).valid, true);

  const paymentBenefit: TimedBenefit = {
    ...benefit,
    timeTrigger: { kind: "payment" },
    eligibilityConditions: [],
    entitlementValidityNote: "加赠自发放时起 30 个自然日内有效。",
    timeCondition: {
      kind: "absolute",
      startsAt: "2026-09-01T10:00:00+08:00",
      endsAt: "2026-09-30T23:59:00+08:00",
      endInclusive: null,
      endPrecision: "minute",
      endUncertaintyReason: "官方只写到分钟，未说明结束分钟是否包含",
    },
  };
  files[2] = file("benefits/example-plan/night-credits.json", paymentBenefit);
  assert.equal(validateCatalog(files).valid, true);
});

void test("把局部资格冲突与整项证据状态分开", () => {
  const files = snapshot();
  const locallyUncertain = structuredClone(benefit);
  locallyUncertain.eligibilityConditions = [
    {
      kind: "one_of",
      field: "plan_tier",
      values: ["Pro", "Pro+"],
      uncertainValues: ["Ultra"],
      uncertaintyReason: "同一官方页面的资格表与 FAQ 对 Ultra 的说法冲突",
    },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", locallyUncertain);
  assert.equal(validateCatalog(files).valid, true);

  const missingReason = record(structuredClone(locallyUncertain));
  const conditions = missingReason.eligibilityConditions;
  assert.ok(Array.isArray(conditions));
  const firstCondition = conditions[0];
  assert.ok(isRecord(firstCondition));
  delete firstCondition.uncertaintyReason;
  files[2] = file("benefits/example-plan/night-credits.json", missingReason);
  assert.ok(
    messages(files).some((message) => message.includes("uncertaintyReason")),
  );

  locallyUncertain.eligibilityConditions = [
    {
      kind: "one_of",
      field: "plan_tier",
      values: ["Pro", "Ultra"],
      uncertainValues: ["Ultra"],
      uncertaintyReason: "官方资料冲突",
    },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", locallyUncertain);
  assert.ok(
    messages(files).some((message) => message.includes("不能同时标为")),
  );
});

void test("拒绝重复资格字段和重复单位费率", () => {
  const files = snapshot();
  const ambiguous = structuredClone(benefit);
  ambiguous.eligibilityConditions = [
    { kind: "one_of", field: "model", values: ["model-a"] },
    { kind: "none_of", field: "model", values: ["model-b"] },
  ];
  ambiguous.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "input",
        measure: { kind: "money", currency: "CNY" },
        per: "1M tokens",
        regular: "2",
        benefit: "1",
      },
      {
        meter: "input",
        measure: { kind: "money", currency: "CNY" },
        per: "1M tokens",
        regular: "2",
        benefit: "1",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", ambiguous);

  const found = messages(files);
  assert.ok(found.some((message) => message.includes("资格字段只能出现一次")));
  assert.ok(found.some((message) => message.includes("费率不得重复")));
});

void test("拒绝错误日期、互斥开始边界及不完整的局部不确定", () => {
  const files = snapshot();
  const invalidDate = structuredClone(benefit);
  if (invalidDate.timeCondition.kind !== "recurring") assert.fail();
  invalidDate.timeCondition.validFromDate = "2026-02-30";
  files[2] = file("benefits/example-plan/night-credits.json", invalidDate);
  assert.ok(
    messages(files).some((message) => message.includes("开始日期无效")),
  );

  invalidDate.timeCondition.validFromDate = "2026-06-23";
  invalidDate.timeCondition.validFrom = "2026-06-23T22:00:00+08:00";
  files[2] = file("benefits/example-plan/night-credits.json", invalidDate);
  assert.equal(validateCatalog(files).valid, false);

  const invalidBoundary = record(structuredClone(benefit));
  invalidBoundary.timeCondition = {
    kind: "absolute",
    startsAt: "2026-09-01T10:00:00+08:00",
    endsAt: "2026-09-30T23:59:59+08:00",
    endInclusive: null,
    endPrecision: "minute",
  };
  files[2] = file("benefits/example-plan/night-credits.json", invalidBoundary);
  assert.ok(
    messages(files).some((message) => message.includes("endUncertaintyReason")),
  );

  invalidBoundary.timeCondition = {
    kind: "absolute",
    startsAt: "2026-09-01T10:00:00+08:00",
    endsAt: "2026-09-30T23:59:59+08:00",
    endInclusive: null,
    endPrecision: "minute",
    endUncertaintyReason: "来源只写到分钟",
  };
  files[2] = file("benefits/example-plan/night-credits.json", invalidBoundary);
  assert.ok(
    messages(files).some((message) => message.includes("来源精度一致")),
  );
});

void test("拒绝坏 JSON、错误文件位置、缺失渠道和悬空权益关系", () => {
  const files = snapshot();
  files[0] = { path: "discovery.json", content: "{" };
  files[1] = file("channels/wrong-name.json", channel);
  const missingChannel = structuredClone(benefit);
  missingChannel.accessChannelId = "missing-plan";
  missingChannel.combinationRelations = [
    {
      relation: "exclusive",
      otherBenefitId: "missing-rule",
      sourceReferences: ["https://example.test/terms"],
    },
  ];
  files[2] = file("benefits/missing-plan/night-credits.json", missingChannel);
  files.push(file("benefits/not-json.txt", {}));
  const found = messages(files);
  assert.ok(found.some((message) => message.includes("不是有效 JSON")));
  assert.ok(
    found.some((message) => message.includes("渠道 ID 必须与文件名一致")),
  );
  assert.ok(
    found.some((message) => message.includes("被引用的使用渠道不存在")),
  );
  assert.ok(
    found.some((message) => message.includes("被引用的同渠道权益不存在")),
  );
  assert.ok(found.some((message) => message.includes("不是约定的")));
});

void test("拒绝错误来源、无效时间和反向优惠", () => {
  const files = snapshot();
  const invalid = structuredClone(benefit);
  invalid.sourceReferences = ["https://user:secret@example.test/pricing"];
  invalid.timeCondition = {
    kind: "absolute",
    startsAt: "2026-02-30T00:00:00Z",
    endsAt: "2026-02-01T00:00:00Z",
    endInclusive: false,
  };
  invalid.effect = {
    kind: "multiplier",
    target: "credits",
    unit: "模型调用积分",
    value: "1.2",
  };
  files[2] = file("benefits/example-plan/night-credits.json", invalid);
  const found = messages(files);
  assert.ok(found.some((message) => message.includes("无凭据")));
  assert.ok(found.some((message) => message.includes("开始时点无效")));
  assert.ok(found.some((message) => message.includes("倍数必须小于 1")));

  const invalidZone = structuredClone(benefit);
  if (invalidZone.timeCondition.kind !== "recurring") assert.fail();
  invalidZone.timeCondition.timeZone = "Bad/Zone";
  invalidZone.timeCondition.calendarExceptions!.coveredYears = [2025];
  invalidZone.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "input",
        measure: { kind: "money", currency: "CNY" },
        per: "百万 Token",
        regular: "2",
        benefit: "3",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", invalidZone);
  const more = messages(files);
  assert.ok(more.some((message) => message.includes("IANA 时区")));
  assert.ok(more.some((message) => message.includes("已核验年份")));
  assert.ok(more.some((message) => message.includes("费率须低于")));
});

void test("拒绝 ID 与文件名不一致、重复入口 URL 和同渠道重复权益", () => {
  const files = snapshot();
  const duplicateDiscovery = structuredClone(discovery);
  duplicateDiscovery.entries.push(
    structuredClone(duplicateDiscovery.entries[0]!),
  );
  files[0] = file("discovery.json", duplicateDiscovery);
  files.push(file("benefits/example-plan/another-name.json", benefit));
  const found = messages(files);
  assert.ok(found.some((message) => message.includes("发现入口 URL 不得重复")));
  assert.ok(
    found.some((message) => message.includes("权益 ID 必须与文件名一致")),
  );
  assert.ok(found.some((message) => message.includes("权益 ID 不得重复")));
});
