export type SourceReference = string;

export type EligibilityCondition =
  | {
      kind: "one_of" | "none_of";
      field:
        | "model"
        | "meter"
        | "plan_tier"
        | "tool"
        | "region"
        | "client"
        | "account_type"
        | "billing_mode";
      values: string[];
    }
  | { kind: "text"; description: string };

export type LocalWindow = {
  weekdays: number[];
  start: string;
  end: string;
};

export type DateWindow = { start: string; end: string };

export type CalendarExceptions = {
  coveredYears: number[];
  overrides: { date: string; windows: DateWindow[] }[];
  sourceReferences: SourceReference[];
};

export type TimeCondition =
  | {
      kind: "absolute";
      startsAt: string;
      endsAt: string;
      endInclusive: boolean;
    }
  | {
      kind: "recurring";
      timeZone: string;
      sourceTimeZoneText: string;
      windows: LocalWindow[];
      validFrom?: string;
      validUntil?: string;
      calendarExceptions?: CalendarExceptions;
    }
  | { kind: "unresolved"; publishedText: string; reason: string };

export type Effect =
  | {
      kind: "unit_rate";
      entries: {
        meter: string;
        measure:
          | { kind: "money"; currency: string }
          | { kind: "credits" | "quota"; unit: string };
        per: string;
        regular: string;
        benefit: string;
      }[];
    }
  | {
      kind: "multiplier";
      target: "price" | "credits" | "quota";
      unit: string;
      value: string;
    }
  | { kind: "unresolved"; publishedText: string; reason: string };

export type CombinationRelation = {
  relation: "exclusive" | "stackable" | "overrides";
  otherBenefitId: string;
  sourceReferences: SourceReference[];
};

export type TimedBenefit = {
  $schema: "../../schema/benefit.schema.json";
  schemaVersion: 1;
  accessChannelId: string;
  id: string;
  title: string;
  sourceReferences: SourceReference[];
  eligibilityConditions: EligibilityCondition[];
  timeCondition: TimeCondition;
  effect: Effect;
  combinationRelations?: CombinationRelation[];
} & (
  | { evidenceStatus: "supported"; uncertaintyReason?: never }
  | { evidenceStatus: "uncertain"; uncertaintyReason: string }
);

export type ChannelRecord = {
  $schema: "../schema/channel.schema.json";
  schemaVersion: 1;
  billingProvider: string;
  accessChannel: {
    id: string;
    name: string;
    kind: "metered_api" | "plan" | "other";
  };
  sourceReferences: SourceReference[];
  billingDecisionInstant?: {
    kind: "request_started" | "server_received" | "other";
    description: string;
    sourceReferences: SourceReference[];
  };
};

export type DiscoveryEntry = {
  title: string;
  url: string;
  description: string;
};

export type DiscoveryCatalog = {
  $schema: "schema/discovery.schema.json";
  schemaVersion: 1;
  entries: DiscoveryEntry[];
};

export type CatalogFile = { path: string; content: string };

export type Catalog = {
  channels: ChannelRecord[];
  benefits: TimedBenefit[];
  discovery: DiscoveryCatalog;
};
