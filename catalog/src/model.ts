import type {
  CalendarExceptions as LegacyCalendarExceptions,
  DateWindow as LegacyDateWindow,
  LocalWindow as LegacyLocalWindow,
  TimedBenefit,
  V2CalendarExceptions,
  V2DateWindow,
  V2LocalWindow,
} from "./generated/benefit.ts";
import type { ChannelRecord } from "./generated/channel.ts";
import type { DiscoveryCatalog } from "./generated/discovery.ts";

export type { TimedBenefit } from "./generated/benefit.ts";
export type { ChannelRecord } from "./generated/channel.ts";
export type { DiscoveryCatalog } from "./generated/discovery.ts";

export type CalendarExceptions =
  | LegacyCalendarExceptions
  | V2CalendarExceptions;
export type CombinationRelation = NonNullable<
  TimedBenefit["combinationRelations"]
>[number];
export type DateWindow = LegacyDateWindow | V2DateWindow;
export type Effect = TimedBenefit["effect"];
export type EligibilityCondition =
  TimedBenefit["eligibilityConditions"][number];
export type LocalWindow = LegacyLocalWindow | V2LocalWindow;
export type TimeCondition = TimedBenefit["timeCondition"];
export type TimeTrigger = TimedBenefit["timeTrigger"];

export type DiscoveryEntry = DiscoveryCatalog["entries"][number];

export type CatalogFile = { path: string; content: string };

export type Catalog = {
  channels: ChannelRecord[];
  benefits: TimedBenefit[];
  discovery: DiscoveryCatalog;
};
