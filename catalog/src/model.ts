import type { TimedBenefit } from "./generated/benefit.ts";
import type { ChannelRecord } from "./generated/channel.ts";
import type { DiscoveryCatalog } from "./generated/discovery.ts";

export type {
  CalendarExceptions,
  DateWindow,
  LocalWindow,
  TimedBenefit,
} from "./generated/benefit.ts";
export type { ChannelRecord } from "./generated/channel.ts";
export type { DiscoveryCatalog } from "./generated/discovery.ts";

export type CombinationRelation = NonNullable<
  TimedBenefit["combinationRelations"]
>[number];
export type Effect = TimedBenefit["effect"];
export type EligibilityCondition =
  TimedBenefit["eligibilityConditions"][number];
export type TimeCondition = TimedBenefit["timeCondition"];
export type TimeTrigger = TimedBenefit["timeTrigger"];

export type DiscoveryEntry = DiscoveryCatalog["entries"][number];

export type CatalogFile = { path: string; content: string };

export type Catalog = {
  channels: ChannelRecord[];
  benefits: TimedBenefit[];
  discovery: DiscoveryCatalog;
};
