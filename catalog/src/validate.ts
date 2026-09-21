import { Ajv } from "ajv";

import benefitSchema from "../schema/benefit.schema.json" with { type: "json" };
import channelSchema from "../schema/channel.schema.json" with { type: "json" };
import discoverySchema from "../schema/discovery.schema.json" with { type: "json" };
import type {
  Catalog,
  CatalogFile,
  ChannelRecord,
  DateWindow,
  DiscoveryCatalog,
  SourceReference,
  TimedBenefit,
} from "./model.ts";

export type ValidationIssue = {
  file: string;
  path: string;
  message: string;
};

export type ValidationResult =
  | { valid: true; catalog: Catalog }
  | { valid: false; issues: ValidationIssue[] };

const channelPath = /^channels\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;
const benefitPath =
  /^benefits\/([a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/;

const ajv = new Ajv({ allErrors: true, strict: true });
const validateChannelShape = ajv.compile<ChannelRecord>(channelSchema);
const validateBenefitShape = ajv.compile<TimedBenefit>(benefitSchema);
const validateDiscoveryShape = ajv.compile<DiscoveryCatalog>(discoverySchema);

function issue(
  issues: ValidationIssue[],
  file: string,
  path: string,
  message: string,
): void {
  issues.push({ file, path, message });
}

function schemaIssues(
  issues: ValidationIssue[],
  file: string,
  errors: typeof validateChannelShape.errors,
): void {
  for (const error of errors ?? []) {
    const property =
      error.keyword === "required"
        ? error.params.missingProperty
        : error.keyword === "additionalProperties"
          ? error.params.additionalProperty
          : undefined;
    issue(
      issues,
      file,
      property === undefined
        ? error.instancePath || "/"
        : `${error.instancePath}/${property}`,
      error.message ?? "不符合规则 JSON 契约",
    );
  }
}

function parse(file: CatalogFile, issues: ValidationIssue[]): unknown {
  try {
    return JSON.parse(file.content) as unknown;
  } catch (error) {
    issue(issues, file.path, "/", `不是有效 JSON：${String(error)}`);
    return undefined;
  }
}

function validDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function instant(value: string): number | undefined {
  if (!validDate(value.slice(0, 10))) return undefined;
  const match =
    /^\d{4}-\d{2}-\d{2}T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (match === null) return undefined;
  const [, hour, minute, second, offsetHour, offsetMinute] = match;
  if (
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    Number(offsetHour ?? 0) > 23 ||
    Number(offsetMinute ?? 0) > 59
  ) {
    return undefined;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function compareDecimals(left: string, right: string): number {
  const [leftWhole = "0", leftFraction = ""] = left.split(".");
  const [rightWhole = "0", rightFraction = ""] = right.split(".");
  const width = Math.max(leftFraction.length, rightFraction.length);
  const leftValue = BigInt(leftWhole + leftFraction.padEnd(width, "0"));
  const rightValue = BigInt(rightWhole + rightFraction.padEnd(width, "0"));
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

function checkSourceReference(
  source: SourceReference,
  file: string,
  path: string,
  issues: ValidationIssue[],
): void {
  try {
    const url = new URL(source);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.hostname === "" ||
      url.username !== "" ||
      url.password !== ""
    ) {
      issue(issues, file, path, "来源必须是无凭据的 HTTP(S) 绝对 URL");
    }
  } catch {
    issue(issues, file, path, "来源必须是有效的绝对 URL");
  }
}

function checkSourceReferences(
  sources: SourceReference[],
  file: string,
  path: string,
  issues: ValidationIssue[],
): void {
  sources.forEach((source, index) => {
    checkSourceReference(source, file, `${path}/${index}`, issues);
  });
}

function checkWindow(
  window: DateWindow,
  file: string,
  path: string,
  issues: ValidationIssue[],
): void {
  if (window.start === window.end) {
    issue(issues, file, path, "时段起止不能相同；全天请使用 00:00–24:00");
  }
}

function checkBenefit(
  benefit: TimedBenefit,
  file: string,
  issues: ValidationIssue[],
): void {
  checkSourceReferences(
    benefit.sourceReferences,
    file,
    "/sourceReferences",
    issues,
  );

  const time = benefit.timeCondition;
  if (time.kind === "absolute") {
    const start = instant(time.startsAt);
    const end = instant(time.endsAt);
    if (start === undefined) {
      issue(issues, file, "/timeCondition/startsAt", "开始时点无效");
    }
    if (end === undefined) {
      issue(issues, file, "/timeCondition/endsAt", "结束时点无效");
    }
    if (start !== undefined && end !== undefined && start >= end) {
      issue(issues, file, "/timeCondition", "结束时点必须晚于开始时点");
    }
    if (time.endInclusive === null) {
      const sourceClock = time.endsAt.slice(11, 19);
      const precisionMatches =
        (time.endPrecision === "day" && sourceClock === "00:00:00") ||
        (time.endPrecision === "minute" && sourceClock.endsWith(":00")) ||
        (time.endPrecision === "second" &&
          /^\d{2}:\d{2}:\d{2}$/.test(sourceClock));
      if (!precisionMatches || time.endsAt.includes(".")) {
        issue(
          issues,
          file,
          "/timeCondition/endPrecision",
          "待核实的结束边界时点须与来源精度一致",
        );
      }
    }
  } else if (time.kind === "recurring") {
    try {
      new Intl.DateTimeFormat("en", { timeZone: time.timeZone });
    } catch {
      issue(
        issues,
        file,
        "/timeCondition/timeZone",
        "必须使用可识别的 IANA 时区",
      );
    }
    time.windows.forEach((window, index) => {
      checkWindow(window, file, `/timeCondition/windows/${index}`, issues);
    });
    const from =
      time.validFrom === undefined ? undefined : instant(time.validFrom);
    const until =
      time.validUntil === undefined ? undefined : instant(time.validUntil);
    if (time.validFrom !== undefined && from === undefined) {
      issue(issues, file, "/timeCondition/validFrom", "有效期开始时点无效");
    }
    if (time.validFromDate !== undefined && !validDate(time.validFromDate)) {
      issue(issues, file, "/timeCondition/validFromDate", "开始日期无效");
    }
    if (time.validUntil !== undefined && until === undefined) {
      issue(issues, file, "/timeCondition/validUntil", "有效期结束时点无效");
    }
    if (from !== undefined && until !== undefined && from >= until) {
      issue(issues, file, "/timeCondition", "有效期结束必须晚于开始");
    }
    const calendar = time.calendarExceptions;
    if (calendar !== undefined) {
      checkSourceReferences(
        calendar.sourceReferences,
        file,
        "/timeCondition/calendarExceptions/sourceReferences",
        issues,
      );
      const seenDates = new Set<string>();
      calendar.overrides.forEach((override, index) => {
        const path = `/timeCondition/calendarExceptions/overrides/${index}`;
        if (!validDate(override.date)) {
          issue(issues, file, `${path}/date`, "例外日期无效");
        }
        if (seenDates.has(override.date)) {
          issue(issues, file, `${path}/date`, "例外日期不得重复");
        }
        seenDates.add(override.date);
        if (
          !calendar.coveredYears.includes(Number(override.date.slice(0, 4)))
        ) {
          issue(issues, file, `${path}/date`, "例外日期不在已核验年份内");
        }
        override.windows.forEach((window, windowIndex) => {
          checkWindow(window, file, `${path}/windows/${windowIndex}`, issues);
        });
      });
    }
  }

  const effect = benefit.effect;
  if (effect.kind === "unit_rate") {
    effect.entries.forEach((entry, index) => {
      if (
        entry.measure.kind !== "quota" &&
        compareDecimals(entry.regular, "0") <= 0
      ) {
        issue(
          issues,
          file,
          `/effect/entries/${index}/regular`,
          "通常费用或积分费率必须大于零",
        );
      }
      const comparison = compareDecimals(entry.benefit, entry.regular);
      if (
        (entry.measure.kind === "quota" && comparison <= 0) ||
        (entry.measure.kind !== "quota" && comparison >= 0)
      ) {
        issue(
          issues,
          file,
          `/effect/entries/${index}/benefit`,
          "费用／积分费率须低于通常费率；额度须高于通常额度",
        );
      }
    });
  } else if (effect.kind === "multiplier") {
    const comparison = compareDecimals(effect.value, "1");
    if (
      (effect.target === "quota" && comparison <= 0) ||
      (effect.target !== "quota" && comparison >= 0)
    ) {
      issue(
        issues,
        file,
        "/effect/value",
        "费用／消耗倍数必须小于 1；额度倍数必须大于 1",
      );
    }
  }

  benefit.combinationRelations?.forEach((relation, index) => {
    checkSourceReferences(
      relation.sourceReferences,
      file,
      `/combinationRelations/${index}/sourceReferences`,
      issues,
    );
  });
}

export function validateCatalog(
  files: readonly CatalogFile[],
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const channels: { file: string; value: ChannelRecord }[] = [];
  const benefits: { file: string; value: TimedBenefit }[] = [];
  let discovery: DiscoveryCatalog | undefined;
  const seenPaths = new Set<string>();

  for (const file of files.toSorted((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    if (seenPaths.has(file.path)) {
      issue(issues, file.path, "/", "目录中存在重复文件路径");
      continue;
    }
    seenPaths.add(file.path);
    if (
      file.path === "channels/.gitkeep" ||
      file.path === "benefits/.gitkeep"
    ) {
      continue;
    }

    const channelMatch = channelPath.exec(file.path);
    const benefitMatch = benefitPath.exec(file.path);
    if (
      file.path !== "discovery.json" &&
      channelMatch === null &&
      benefitMatch === null
    ) {
      issue(issues, file.path, "/", "不是约定的渠道、权益或发现入口数据位置");
      continue;
    }
    const value = parse(file, issues);
    if (value === undefined) continue;

    if (file.path === "discovery.json") {
      if (!validateDiscoveryShape(value)) {
        schemaIssues(issues, file.path, validateDiscoveryShape.errors);
        continue;
      }
      discovery = value;
      const urls = new Set<string>();
      for (const [index, entry] of discovery.entries.entries()) {
        if (urls.has(entry.url)) {
          issue(
            issues,
            file.path,
            `/entries/${index}/url`,
            "发现入口 URL 不得重复",
          );
        }
        urls.add(entry.url);
        checkSourceReference(
          entry.url,
          file.path,
          `/entries/${index}/url`,
          issues,
        );
      }
      continue;
    }

    if (channelMatch !== null) {
      if (!validateChannelShape(value)) {
        schemaIssues(issues, file.path, validateChannelShape.errors);
        continue;
      }
      channels.push({ file: file.path, value });
      if (value.accessChannel.id !== channelMatch[1]) {
        issue(
          issues,
          file.path,
          "/accessChannel/id",
          "渠道 ID 必须与文件名一致",
        );
      }
      checkSourceReferences(
        value.sourceReferences,
        file.path,
        "/sourceReferences",
        issues,
      );
      if (value.billingDecisionInstant !== undefined) {
        checkSourceReferences(
          value.billingDecisionInstant.sourceReferences,
          file.path,
          "/billingDecisionInstant/sourceReferences",
          issues,
        );
      }
      continue;
    }

    if (benefitMatch !== null) {
      if (!validateBenefitShape(value)) {
        schemaIssues(issues, file.path, validateBenefitShape.errors);
        continue;
      }
      benefits.push({ file: file.path, value });
      if (value.accessChannelId !== benefitMatch[1]) {
        issue(
          issues,
          file.path,
          "/accessChannelId",
          "渠道 ID 必须与所在目录一致",
        );
      }
      if (value.id !== benefitMatch[2]) {
        issue(issues, file.path, "/id", "权益 ID 必须与文件名一致");
      }
      checkBenefit(value, file.path, issues);
    }
  }

  if (discovery === undefined) {
    issue(issues, "discovery.json", "/", "缺少有效的发现入口清单");
  }

  const channelIds = new Set<string>();
  for (const channel of channels) {
    const id = channel.value.accessChannel.id;
    if (channelIds.has(id)) {
      issue(issues, channel.file, "/accessChannel/id", "使用渠道 ID 不得重复");
    }
    channelIds.add(id);
  }

  const benefitIds = new Map<string, Set<string>>();
  for (const benefit of benefits) {
    const channelId = benefit.value.accessChannelId;
    if (!channelIds.has(channelId)) {
      issue(issues, benefit.file, "/accessChannelId", "被引用的使用渠道不存在");
    }
    const ids = benefitIds.get(channelId) ?? new Set<string>();
    if (ids.has(benefit.value.id)) {
      issue(issues, benefit.file, "/id", "同一计费渠道内的权益 ID 不得重复");
    }
    ids.add(benefit.value.id);
    benefitIds.set(channelId, ids);
  }

  for (const benefit of benefits) {
    const seenRelations = new Set<string>();
    benefit.value.combinationRelations?.forEach((relation, index) => {
      const path = `/combinationRelations/${index}/otherBenefitId`;
      if (relation.otherBenefitId === benefit.value.id) {
        issue(issues, benefit.file, path, "权益不能引用自身");
      } else if (
        !benefitIds
          .get(benefit.value.accessChannelId)
          ?.has(relation.otherBenefitId)
      ) {
        issue(issues, benefit.file, path, "被引用的同渠道权益不存在");
      }
      if (seenRelations.has(relation.otherBenefitId)) {
        issue(issues, benefit.file, path, "同一权益关系不得重复或互相矛盾");
      }
      seenRelations.add(relation.otherBenefitId);
    });
  }

  if (issues.length > 0 || discovery === undefined) {
    return { valid: false, issues };
  }
  return {
    valid: true,
    catalog: {
      channels: channels.map(({ value }) => value),
      benefits: benefits.map(({ value }) => value),
      discovery,
    },
  };
}
