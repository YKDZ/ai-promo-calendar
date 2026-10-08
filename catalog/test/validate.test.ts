import assert from "node:assert/strict";
import { test } from "node:test";

import type {
  CatalogFile,
  ChannelRecord,
  DiscoveryCatalog,
  TimeCondition,
  TimedBenefit,
} from "../src/model.ts";
import { validateCatalog } from "../src/validate.ts";

const channel: ChannelRecord = {
  $schema: "../schema/channel.schema.json",
  schemaVersion: 2,
  billingProvider: "示例计费方",
  accessChannel: { id: "example-plan", name: "示例套餐", kind: "plan" },
  sourceReferences: ["https://example.test/plan"],
  billingDecisionInstant: {
    kind: "server_received",
    sourceReferences: ["https://example.test/billing"],
  },
};

const benefit: TimedBenefit = {
  $schema: "../../schema/benefit.schema.json",
  schemaVersion: 2,
  accessChannelId: "example-plan",
  id: "night-credits",
  evidenceStatus: "supported",
  sourceReferences: ["https://example.test/pricing"],
  eligibilityConditions: [
    { kind: "one_of", field: "model", values: ["model-a"] },
  ],
  timeTrigger: { kind: "model_request" },
  timeCondition: {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
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
    unit: "模型积分",
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

function record(value: unknown): Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === "object" && !Array.isArray(value),
  );
  return value as Record<string, unknown>;
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

void test("接受有来源的跨午夜权益与零权益渠道", () => {
  const files = snapshot();
  assert.equal(validateCatalog(files).valid, true);
  assert.equal(
    validateCatalog(files.filter(({ path }) => !path.startsWith("benefits/")))
      .valid,
    true,
  );

  const quota = structuredClone(benefit);
  quota.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "试用额度",
        measure: { kind: "quota", unit: "次" },
        per: "次赠送",
        regular: "0",
        benefit: "100",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", quota);
  assert.equal(validateCatalog(files).valid, true);
});

void test("同渠道同模型的独立端点保留各自优惠与已核实资格子范围", () => {
  const files = snapshot();
  const first = record(structuredClone(benefit));
  first.schemaVersion = 3;
  delete first.evidenceStatus;
  first.eligibilityConditions = [
    { kind: "one_of", field: "model", values: ["model-a"] },
    { kind: "one_of", field: "service_endpoint", values: ["供应方 Default"] },
    { kind: "one_of", field: "billing_mode", values: ["月付"] },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", first);
  const second = structuredClone(first);
  second.id = "flex-credits";
  second.eligibilityConditions = [
    { kind: "one_of", field: "model", values: ["model-a"] },
    { kind: "one_of", field: "service_endpoint", values: ["供应方 Flex"] },
  ];
  second.effect = {
    kind: "multiplier",
    target: "credits",
    unit: "模型积分",
    value: "0.25",
  };
  files.push(file("benefits/example-plan/flex-credits.json", second));

  const result = validateCatalog(files);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.equal(result.catalog.benefits.length, 2);
  assert.deepEqual(
    result.catalog.benefits[1]?.eligibilityConditions,
    first.eligibilityConditions,
  );

  second.eligibilityConditions = [
    { kind: "one_of", field: "service_endpoint", values: ["供应方 Flex"] },
    { kind: "none_of", field: "service_endpoint", values: ["供应方 Default"] },
  ];
  files[3] = file("benefits/example-plan/flex-credits.json", second);
  assert.ok(
    messages(files).some((message) => message.includes("资格字段只能出现一次")),
  );
});

void test("过渡期按版本严格隔离旧证据状态和新版端点条件", () => {
  const files = snapshot();
  assert.equal(validateCatalog(files).valid, true);
  const next = record(structuredClone(benefit));
  next.schemaVersion = 3;
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, false);
  delete next.evidenceStatus;
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.eligibilityConditions = [
    {
      kind: "one_of",
      field: "plan_tier",
      values: ["Pro"],
      uncertainValues: ["Ultra"],
    },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, false);
  next.schemaVersion = 2;
  next.evidenceStatus = "uncertain";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.eligibilityConditions = [
    { kind: "one_of", field: "service_endpoint", values: ["供应方 Flex"] },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, false);
});

void test("维护检查扫描完整候选目录，结构校验不因时间流逝失效", () => {
  const files = snapshot();
  const untouched = structuredClone(benefit);
  untouched.id = "previous-campaign";
  untouched.timeCondition = {
    kind: "absolute",
    endsAt: "2026-10-01T00:00:00Z",
    endInclusive: false,
  };
  files.push(file("benefits/example-plan/previous-campaign.json", untouched));
  assert.equal(validateCatalog(files).valid, true);
  assert.equal(
    validateCatalog(files, { asOf: "2026-09-30T23:59:59Z" }).valid,
    true,
  );
  const result = validateCatalog(files, { asOf: "2026-10-01T00:00:00Z" });
  assert.equal(result.valid, false);
  if (result.valid) assert.fail();
  assert.deepEqual(
    result.issues.map(({ file: path, path: field }) => [path, field]),
    [["benefits/example-plan/previous-campaign.json", "/timeCondition/endsAt"]],
  );
  assert.match(result.issues[0]!.message, /确定结束/);
});

void test("确定过期尊重结束包含性及分钟和秒的未知精度", () => {
  const cases: { time: TimeCondition; pending: string; expired: string }[] = [
    {
      time: {
        kind: "absolute",
        endsAt: "2026-10-01T00:00:00Z",
        endInclusive: true,
      },
      pending: "2026-10-01T00:00:00Z",
      expired: "2026-10-01T00:00:00.001Z",
    },
    {
      time: {
        kind: "absolute",
        endsAt: "2026-10-01T00:00:00+08:00",
        endInclusive: null,
        endPrecision: "minute",
      },
      pending: "2026-09-30T16:00:59.999Z",
      expired: "2026-09-30T16:01:00Z",
    },
    {
      time: {
        kind: "absolute",
        endsAt: "2026-10-01T00:00:00Z",
        endInclusive: null,
        endPrecision: "second",
      },
      pending: "2026-10-01T00:00:00.999Z",
      expired: "2026-10-01T00:00:01Z",
    },
  ];
  for (const { time, pending, expired } of cases) {
    const files = snapshot();
    files[2] = file("benefits/example-plan/night-credits.json", {
      ...benefit,
      timeCondition: time,
    });
    assert.equal(
      validateCatalog(files, { asOf: pending }).valid,
      true,
      pending,
    );
    assert.equal(
      validateCatalog(files, { asOf: expired }).valid,
      false,
      expired,
    );
  }
});

void test("重复政策只按总有效期结束，峰时和未知未来日历不等于政策过期", () => {
  const files = snapshot();
  // 北京时间中午不在夜间窗口内，但没有总截止的政策仍保留。
  assert.equal(
    validateCatalog(files, { asOf: "2026-10-08T04:00:00Z" }).valid,
    true,
  );
  assert.equal(
    validateCatalog(files, { asOf: "2028-01-03T04:00:00Z" }).valid,
    true,
  );
  const next = structuredClone(benefit);
  if (next.timeCondition.kind !== "recurring") assert.fail();
  next.timeCondition.validUntil = "2026-10-08T12:00:00+08:00";
  next.effect = { kind: "unresolved" };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(
    validateCatalog(files, { asOf: "2026-10-08T03:59:59Z" }).valid,
    true,
  );
  const result = validateCatalog(files, { asOf: "2026-10-08T04:00:00Z" });
  assert.equal(result.valid, false);
  if (result.valid) assert.fail();
  assert.equal(result.issues[0]?.path, "/timeCondition/validUntil");
});

void test("未知时区日期只在保守界限后到期，日精度不假定夏令时结束日为24小时", () => {
  const cases: {
    time: TimeCondition;
    pending: string;
    expired: string;
    path: string;
  }[] = [
    {
      time: {
        kind: "unresolved",
        knownBoundaries: [{ role: "end", date: "2026-10-01", timeZone: null }],
      },
      pending: "2026-10-02T23:59:59Z",
      expired: "2026-10-03T00:00:00Z",
      path: "/timeCondition/knownBoundaries/0/date",
    },
    {
      // 美国东部该民用日可能持续25小时，不能按结束日午夜加24小时判过期。
      time: {
        kind: "absolute",
        endsAt: "2026-11-01T00:00:00-04:00",
        endInclusive: null,
        endPrecision: "day",
      },
      pending: "2026-11-02T04:30:00Z",
      expired: "2026-11-03T00:00:00Z",
      path: "/timeCondition/endsAt",
    },
  ];
  for (const { time, pending, expired, path } of cases) {
    const files = snapshot();
    files[2] = file("benefits/example-plan/night-credits.json", {
      ...benefit,
      timeCondition: time,
      effect: { kind: "unresolved" },
    });
    assert.equal(validateCatalog(files, { asOf: pending }).valid, true);
    const result = validateCatalog(files, { asOf: expired });
    assert.equal(result.valid, false);
    if (result.valid) assert.fail();
    assert.equal(result.issues[0]?.path, path);
  }
  const files = snapshot();
  files[2] = file("benefits/example-plan/night-credits.json", {
    ...benefit,
    timeCondition: {
      kind: "unresolved",
      knownBoundaries: [{ role: "start", date: "2020-01-01", timeZone: null }],
    },
    effect: { kind: "unresolved" },
  });
  assert.equal(
    validateCatalog(files, { asOf: "2026-10-08T00:00:00Z" }).valid,
    true,
  );
});

void test("亚毫秒截止不因时钟精度截断被提前判过期", () => {
  const cases: TimeCondition[] = [
    {
      kind: "absolute",
      endsAt: "2026-10-01T00:00:00.0009Z",
      endInclusive: false,
    },
    {
      kind: "recurring",
      timeZone: "Asia/Shanghai",
      windows: [
        { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "00:00", end: "24:00" },
      ],
      validUntil: "2026-10-01T00:00:00.0009Z",
    },
  ];
  for (const time of cases) {
    const files = snapshot();
    files[2] = file("benefits/example-plan/night-credits.json", {
      ...benefit,
      timeCondition: time,
    });
    assert.equal(
      validateCatalog(files, { asOf: "2026-10-01T00:00:00.000Z" }).valid,
      true,
    );
    assert.equal(
      validateCatalog(files, { asOf: "2026-10-01T00:00:00.001Z" }).valid,
      false,
    );
  }
  assert.throws(
    () => validateCatalog(snapshot(), { asOf: "next Thursday" }),
    /asOf/,
  );
  assert.throws(
    () => validateCatalog(snapshot(), { asOf: "2026-02-30T00:00:00Z" }),
    /asOf/,
  );
});

void test("局部资格冲突与整项证据状态独立，重复或交叉值被拒绝", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.evidenceStatus = "uncertain";
  next.eligibilityConditions = [
    {
      kind: "one_of",
      field: "plan_tier",
      values: ["Pro"],
      uncertainValues: ["Ultra"],
    },
  ];
  next.effect = { kind: "unresolved" };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.eligibilityConditions = [
    {
      kind: "one_of",
      field: "model",
      values: ["model-a"],
      uncertainValues: ["model-a"],
    },
    { kind: "none_of", field: "model", values: ["model-b"] },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  const found = messages(files);
  assert.ok(found.some((message) => message.includes("资格字段只能出现一次")));
  assert.ok(found.some((message) => message.includes("不能同时标为")));
});

void test("无时区的已知日期保留角色且拒绝无效、重复或倒置边界", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.timeTrigger = { kind: "subscription_order" };
  next.timeCondition = {
    kind: "unresolved",
    knownBoundaries: [{ role: "start", date: "2026-08-05", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  const time = record(next.timeCondition);
  time.knownBoundaries = [
    { role: "start", date: "2026-02-30", timeZone: null },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("边界日期无效")),
  );

  time.knownBoundaries = [
    { role: "start", date: "2026-08-05", timeZone: null },
    { role: "start", date: "2026-08-06", timeZone: null },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("边界角色重复")),
  );

  time.knownBoundaries = [
    { role: "start", date: "2026-09-01", timeZone: null },
    { role: "end", date: "2026-08-28", timeZone: null },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("结束日期早于开始")),
  );
});

void test("已知每日窗口或精确起点不因无时区结束日期丢失", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.timeCondition = {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
    windows: [
      { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "22:00", end: "08:00" },
    ],
    knownBoundaries: [{ role: "end", date: "2027-01-01", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.timeCondition = {
    kind: "absolute",
    startsAt: "2026-09-01T10:00:00+08:00",
    knownBoundaries: [{ role: "end", date: "2027-01-01", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.timeCondition.knownBoundaries = [
    { role: "start", date: "2026-09-01", timeZone: null },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("开始边界不得重复")),
  );
});

void test("部分时间边界仍拒绝确定倒置的区间", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.timeCondition = {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
    windows: [
      { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "22:00", end: "08:00" },
    ],
    validFromDate: "2027-01-01",
    validUntil: "2026-01-01T00:00:00Z",
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) =>
      message.includes("结束时点早于已知开始日期"),
    ),
  );

  next.timeCondition = {
    kind: "absolute",
    startsAt: "2027-01-01T00:00:00Z",
    knownBoundaries: [{ role: "end", date: "2026-01-01", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) =>
      message.includes("开始时点晚于已知结束日期"),
    ),
  );

  next.timeCondition = {
    kind: "recurring",
    timeZone: "Asia/Shanghai",
    windows: [
      { weekdays: [1, 2, 3, 4, 5, 6, 7], start: "22:00", end: "08:00" },
    ],
    validFromDate: "2027-01-01",
    knownBoundaries: [{ role: "end", date: "2026-01-01", timeZone: null }],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("结束日期早于开始日期")),
  );

  next.timeCondition.knownBoundaries = [
    { role: "end", date: "2026-09-01", timeZone: null },
  ];
  next.timeCondition.validFromDate = "2026-09-02";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);
});

void test("结束精度局部未知可保留区间，错误精度与无效时点被拒绝", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.timeCondition = {
    kind: "absolute",
    startsAt: "2026-09-01T10:00:00+08:00",
    endsAt: "2026-09-30T23:59:00+08:00",
    endInclusive: null,
    endPrecision: "minute",
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.timeCondition.endPrecision = "day";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("来源精度一致")),
  );

  next.timeCondition.startsAt = "2026-02-30T10:00:00+08:00";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("开始时点无效")),
  );

  next.timeCondition.endPrecision = "minute";
  next.timeCondition.startsAt = "2026-09-01";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, false);
});

void test("事件类别可知而精确判价时刻未知", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.timeTrigger = { kind: "subscription_order" };
  next.timeCondition = { kind: "unresolved" };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  next.timeTrigger = { kind: "payment" };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  const result = validateCatalog(files);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.equal(result.catalog.benefits[0]?.timeTrigger.kind, "payment");
});

void test("出账事件只属于该项权益，不要求整个渠道采用该判价规则", () => {
  const files = snapshot();
  const nextChannel = structuredClone(channel);
  delete nextChannel.billingDecisionInstant;
  files[1] = file("channels/example-plan.json", nextChannel);

  const nextBenefit = structuredClone(benefit);
  nextBenefit.timeTrigger = { kind: "billing_posted" };
  files[2] = file("benefits/example-plan/night-credits.json", nextBenefit);

  const result = validateCatalog(files);
  assert.equal(result.valid, true);
  if (!result.valid) assert.fail();
  assert.equal(result.catalog.benefits[0]?.timeTrigger.kind, "billing_posted");
});

void test("仅有优惠费率可保存；已知通常价时拒绝反向或重复费率", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.effect = {
    kind: "unit_rate",
    entries: [
      {
        meter: "输入",
        measure: { kind: "money", currency: "CNY" },
        per: "1M tokens",
        benefit: "1",
      },
    ],
  };
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.equal(validateCatalog(files).valid, true);

  if (next.effect.kind !== "unit_rate") assert.fail();
  next.effect.entries[0]!.regular = "0.5";
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(messages(files).some((message) => message.includes("费率须低于")));

  next.effect.entries.push(structuredClone(next.effect.entries[0]!));
  files[2] = file("benefits/example-plan/night-credits.json", next);
  assert.ok(
    messages(files).some((message) => message.includes("费率不得重复")),
  );
});

void test("拒绝错误来源、日历例外与悬空跨文件引用", () => {
  const files = snapshot();
  const next = structuredClone(benefit);
  next.sourceReferences = ["https://user:secret@example.test/pricing"];
  if (next.timeCondition.kind !== "recurring") assert.fail();
  next.timeCondition.timeZone = "Bad/Zone";
  next.timeCondition.calendarExceptions!.coveredYears = [2025];
  next.combinationRelations = [
    {
      relation: "exclusive",
      otherBenefitId: "missing-rule",
      sourceReferences: ["https://example.test/terms"],
    },
  ];
  files[2] = file("benefits/example-plan/night-credits.json", next);
  const found = messages(files);
  assert.ok(found.some((message) => message.includes("无凭据")));
  assert.ok(found.some((message) => message.includes("IANA 时区")));
  assert.ok(found.some((message) => message.includes("已核验年份")));
  assert.ok(
    found.some((message) => message.includes("被引用的同渠道权益不存在")),
  );
});

void test("拒绝坏 JSON、错误文件位置、渠道引用及重复发现入口", () => {
  const files = snapshot();
  files[0] = { path: "discovery.json", content: "{" };
  files[1] = file("channels/wrong-name.json", channel);
  const next = structuredClone(benefit);
  next.accessChannelId = "missing-plan";
  files[2] = file("benefits/missing-plan/night-credits.json", next);
  files.push(file("benefits/not-json.txt", {}));
  let found = messages(files);
  assert.ok(found.some((message) => message.includes("不是有效 JSON")));
  assert.ok(
    found.some((message) => message.includes("渠道 ID 必须与文件名一致")),
  );
  assert.ok(
    found.some((message) => message.includes("被引用的使用渠道不存在")),
  );
  assert.ok(found.some((message) => message.includes("不是约定的")));

  const duplicate = structuredClone(discovery);
  duplicate.entries.push(structuredClone(duplicate.entries[0]!));
  files[0] = file("discovery.json", duplicate);
  found = messages(files);
  assert.ok(found.some((message) => message.includes("发现入口 URL 不得重复")));
});
