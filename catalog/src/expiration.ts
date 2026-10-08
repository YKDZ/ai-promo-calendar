import type { TimeCondition } from "./model.ts";

function dateProofBoundary(date: string): number {
  // 两日仅是覆盖未知时区、日内小时及夏令时变化的证明界限，
  // 不是推定政策在 UTC 或任何具体时区的实际截止时刻。
  return Date.parse(`${date}T00:00:00Z`) + 2 * 24 * 60 * 60 * 1_000;
}

function exclusiveEndCeiling(value: string): number {
  const fraction = /\.(\d+)(?:Z|[+-])/.exec(value)?.[1] ?? "";
  // Date.parse 会截断亚毫秒；结束边界向上取整，不能提前宣告结束。
  return Date.parse(value) + (/[1-9]/.test(fraction.slice(3)) ? 1 : 0);
}

/** 已通过结构核验的政策窗口，在判断时点是否已确定结束。 */
export function expiredBoundary(
  time: TimeCondition,
  asOf: number,
): string | undefined {
  if (time.kind === "absolute" && time.endsAt !== undefined) {
    const end = Date.parse(time.endsAt);
    const expired =
      time.endInclusive === true
        ? asOf > end
        : time.endInclusive === false
          ? asOf >= exclusiveEndCeiling(time.endsAt)
          : time.endPrecision === "minute"
            ? asOf >= end + 60_000
            : time.endPrecision === "second"
              ? asOf >= end + 1_000
              : asOf >= dateProofBoundary(time.endsAt.slice(0, 10));
    if (expired) return "/timeCondition/endsAt";
  }
  if (
    time.kind === "recurring" &&
    time.validUntil !== undefined &&
    asOf >= exclusiveEndCeiling(time.validUntil)
  ) {
    return "/timeCondition/validUntil";
  }
  const boundaryIndex = time.knownBoundaries?.findIndex(
    (boundary) => boundary.role === "end",
  );
  if (
    boundaryIndex !== undefined &&
    boundaryIndex >= 0 &&
    asOf >= dateProofBoundary(time.knownBoundaries![boundaryIndex]!.date)
  ) {
    return `/timeCondition/knownBoundaries/${boundaryIndex}/date`;
  }
  return undefined;
}
