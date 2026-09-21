import type { TimedBenefit } from "./generated/benefit.ts";
import type { ChannelRecord } from "./generated/channel.ts";
import type { DiscoveryCatalog } from "./generated/discovery.ts";

export type {
  CalendarExceptions,
  CombinationRelation,
  DateWindow,
  Effect,
  EligibilityCondition,
  LocalWindow,
  TimeCondition,
  TimeTrigger,
  TimedBenefit,
} from "./generated/benefit.ts";
export type { ChannelRecord } from "./generated/channel.ts";
export type { DiscoveryCatalog } from "./generated/discovery.ts";

export type DiscoveryEntry = DiscoveryCatalog["entries"][number];

export type CatalogFile = { path: string; content: string };

export type Catalog = {
  channels: ChannelRecord[];
  benefits: TimedBenefit[];
  discovery: DiscoveryCatalog;
};
