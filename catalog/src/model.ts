export type SourceReference = string;

type EligibilityField =
  | "model"
  | "meter"
  | "plan_tier"
  | "tool"
  | "region"
  | "client"
  | "account_type"
  | "billing_mode";

type OneOfEligibilityCondition = {
  kind: "one_of";
  field: EligibilityField;
  values: string[];
} & (
  | { uncertainValues?: never; uncertaintyReason?: never }
  | { uncertainValues: string[]; uncertaintyReason: string }
);

export type EligibilityCondition =
  | OneOfEligibilityCondition
  | {
      kind: "none_of";
      field: EligibilityField;
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

export type TimeTrigger =
  | { kind: "model_request" | "payment" | "claim" }
  | { kind: "other"; description: string };

export type TimeCondition =
  | {
      kind: "absolute";
      startsAt: string;
      endsAt: string;
      endInclusive: boolean;
      endPrecision?: never;
      endUncertaintyReason?: never;
    }
  | {
      kind: "absolute";
      startsAt: string;
      endsAt: string;
      endInclusive: null;
      endPrecision: "day" | "minute" | "second";
      endUncertaintyReason: string;
    }
  | {
      kind: "recurring";
      timeZone: string;
      sourceTimeZoneText: string;
      windows: LocalWindow[];
      validFrom?: string;
      validFromDate?: string;
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
  timeTrigger?: TimeTrigger;
  timeCondition: TimeCondition;
  entitlementValidityNote?: string;
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
