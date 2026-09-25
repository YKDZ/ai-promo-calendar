/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */

/**
 * 直接支撑本项权益的计费方公开条款 URL；发现入口或第三方转述不能自动代替它。
 *
 * @minItems 1
 */
export type SourceReferences = [string, ...string[]];
/**
 * 每一项都是针对公共查询维度的必要条件，而不是原文全部资格的复刻；所有已记录条件匹配或条件为空，也不证明某账户最终适用。同一字段在一项权益中只出现一次，one_of 可局部保留来源冲突的候选值。账户历史、实际发放、效果解释和一般说明不得写入此处。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "eligibilityCondition".
 */
export type EligibilityCondition =
  | {
      kind: "one_of";
      field: EligibilityField;
      /**
       * 现有公开资料明确支持的值。
       *
       * @minItems 1
       */
      values: [Text, ...Text[]];
      /**
       * 仅列入同一条件中公开资料相互冲突、不能确定是否适用的值；不得与 values 重复。
       *
       * @minItems 1
       */
      uncertainValues?: [Text, ...Text[]];
    }
  | {
      kind: "none_of";
      field: EligibilityField;
      /**
       * @minItems 1
       */
      values: [Text, ...Text[]];
    };
/**
 * 条件针对模型、计费项、套餐档位、工具、地域、客户端、账户类型或计费模式。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "eligibilityField".
 */
export type EligibilityField =
  "model" | "meter" | "plan_tier" | "tool" | "region" | "client" | "account_type" | "billing_mode";
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "text".
 */
export type Text = string;
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "dateTime".
 */
export type DateTime = string;
/**
 * 来源已公布但时区未可靠确定的政策开始或结束日期；不是精确 UTC 时点。不得与同角色的精确边界并存，也不得记录个人取得后的有效期。
 *
 * @minItems 1
 * @maxItems 2
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "knownBoundaries".
 */
export type KnownBoundaries =
  | [
      {
        role: "start" | "end";
        date: Date;
        timeZone: null;
      }
    ]
  | [
      {
        role: "start" | "end";
        date: Date;
        timeZone: null;
      },
      {
        role: "start" | "end";
        date: Date;
        timeZone: null;
      }
    ];
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "date".
 */
export type Date = string;
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "startTime".
 */
export type StartTime = string;
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "endTime".
 */
export type EndTime = string;
/**
 * 发布该日历例外的官方资料 URL，与权益本身的出处分开。
 *
 * @minItems 1
 */
export type SourceReferences1 = [string, ...string[]];
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "measure".
 */
export type Measure =
  | {
      kind: "money";
      currency: string;
    }
  | {
      kind: "credits" | "quota";
      unit: Text;
    };
/**
 * 至少一个可直接追溯的 HTTP(S) URL；Schema 只检查形式，不判断网页权威性或内容。
 *
 * @minItems 1
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "sourceReferences".
 */
export type SourceReferences2 = [string, ...string[]];
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "id".
 */
export type Id = string;
/**
 * 非负十进制数使用字符串，避免浮点舍入；数值方向由目录核验器再检查。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "decimal".
 */
export type Decimal = string;
/**
 * 保存已知政策窗口，不因局部边界未知而丢弃其余时段。absolute 至少有一个精确时点，recurring 保留时区内重复窗口；任何分支都可保存已公布但缺时区的日期边界。没有可用窗口时才用 unresolved。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "timeCondition".
 */
export type TimeCondition =
  | {
      kind: "absolute";
      startsAt?: DateTime;
      endsAt?: DateTime;
      knownBoundaries?: KnownBoundaries;
      /**
       * 仅当 endsAt 已知时填写：明确包含结束时刻为 true，明确不包含为 false；包含性未说明时为 null，并记录来源精度。
       */
      endInclusive?: boolean | null;
      /**
       * 仅在 endInclusive 为 null 时填写；查询在 endsAt 起的相应日、分钟或秒内应标待核实，不能推断结束瞬间。
       */
      endPrecision?: "day" | "minute" | "second";
    }
  | {
      kind: "recurring";
      /**
       * 仅在有出处时填可识别的 IANA 时区，如 Asia/Shanghai。
       */
      timeZone: string;
      /**
       * @minItems 1
       */
      windows: [LocalWindow, ...LocalWindow[]];
      validFrom?: DateTime;
      /**
       * 只公布活动开始的当地日期、未公布具体时刻时填写；该日期内待核实，此前不适用，此后可按重复窗口判断。与 validFrom 互斥。
       */
      validFromDate?: string;
      /**
       * 不含该时点的有效期结束边界；官方未公布结束时不填写，缺省不保证活动永久有效。
       */
      validUntil?: string;
      knownBoundaries?: KnownBoundaries;
      calendarExceptions?: CalendarExceptions;
    }
  | {
      kind: "unresolved";
      knownBoundaries?: KnownBoundaries;
    };
/**
 * 优惠费率可靠时优先使用 unit_rate；通常值可缺省，但不能据此推算节省额或折扣倍数。只有一个实际倍数对本文件全部情形都精确成立时才用 multiplier。宣传标价不等于所有订单实付时保持 unresolved，不能伪装为固定费率。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "effect".
 */
export type Effect =
  | {
      kind: "unit_rate";
      /**
       * @minItems 1
       */
      entries: [
        {
          meter: Text;
          measure: Measure;
          per: Text;
          /**
           * 同渠道、同计费项及同单位的通常费率或额度；通常额度可为 0。
           */
          regular?: string;
          /**
           * 相同时点的实际优惠费率或额度；若有通常值，费用／积分须更低，额度须更高。
           */
          benefit: string;
        },
        ...{
          meter: Text;
          measure: Measure;
          per: Text;
          /**
           * 同渠道、同计费项及同单位的通常费率或额度；通常额度可为 0。
           */
          regular?: string;
          /**
           * 相同时点的实际优惠费率或额度；若有通常值，费用／积分须更低，额度须更高。
           */
          benefit: string;
        }[]
      ];
    }
  | {
      kind: "multiplier";
      target: "price" | "credits" | "quota";
      unit: Text;
      /**
       * 费用／积分倍数低于 1，额度倍数高于 1；0 表示免费但仍需来源明确支持。
       */
      value: string;
    }
  | {
      kind: "unresolved";
    };

/**
 * 一份文件记录同一计费渠道下的一项独立时段权益，而不是笼统对应一张营销活动页面。全部适用情形共享同一政策触发事件和效果范围；套餐档位、计费项或事件导致实际效果不同时拆成不同权益。
 */
export interface TimedBenefit {
  $schema: "../../schema/benefit.schema.json";
  schemaVersion: 2;
  /**
   * 实际负责计费的使用渠道 ID，必须与所在目录及渠道记录一致；模型品牌不是计费渠道。
   */
  accessChannelId: string;
  /**
   * 同一渠道内稳定的权益 ID，必须与文件名一致。
   */
  id: string;
  /**
   * supported 表示当前采纳的公开资料支持本记录；uncertain 表示来源失联或冲突，不能当作确定生效。它不是任务分派状态。
   */
  evidenceStatus: "supported" | "uncertain";
  sourceReferences: SourceReferences;
  /**
   * 数组成员只是已结构化的必要条件；全部匹配或空数组都不证明某个账户最终享有权益。账户历史与实际发放情况不在目录中判定。
   */
  eligibilityConditions: EligibilityCondition[];
  timeTrigger: TimeTrigger;
  /**
   * 政策触发事件的时间窗口；有已知窗口但某个边界、年份或账号状态不明时保留已知部分，勿把整条规则标为 unresolved。
   */
  timeCondition:
    | {
        kind: "absolute";
        startsAt?: DateTime;
        endsAt?: DateTime;
        knownBoundaries?: KnownBoundaries;
        /**
         * 仅当 endsAt 已知时填写：明确包含结束时刻为 true，明确不包含为 false；包含性未说明时为 null，并记录来源精度。
         */
        endInclusive?: boolean | null;
        /**
         * 仅在 endInclusive 为 null 时填写；查询在 endsAt 起的相应日、分钟或秒内应标待核实，不能推断结束瞬间。
         */
        endPrecision?: "day" | "minute" | "second";
      }
    | {
        kind: "recurring";
        /**
         * 仅在有出处时填可识别的 IANA 时区，如 Asia/Shanghai。
         */
        timeZone: string;
        /**
         * @minItems 1
         */
        windows: [LocalWindow, ...LocalWindow[]];
        validFrom?: DateTime;
        /**
         * 只公布活动开始的当地日期、未公布具体时刻时填写；该日期内待核实，此前不适用，此后可按重复窗口判断。与 validFrom 互斥。
         */
        validFromDate?: string;
        /**
         * 不含该时点的有效期结束边界；官方未公布结束时不填写，缺省不保证活动永久有效。
         */
        validUntil?: string;
        knownBoundaries?: KnownBoundaries;
        calendarExceptions?: CalendarExceptions;
      }
    | {
        kind: "unresolved";
        knownBoundaries?: KnownBoundaries;
      };
  /**
   * 同一使用渠道内相对通常规则的变化，保持官方原有货币、积分或额度单位。
   */
  effect:
    | {
        kind: "unit_rate";
        /**
         * @minItems 1
         */
        entries: [
          {
            meter: Text;
            measure: Measure;
            per: Text;
            /**
             * 同渠道、同计费项及同单位的通常费率或额度；通常额度可为 0。
             */
            regular?: string;
            /**
             * 相同时点的实际优惠费率或额度；若有通常值，费用／积分须更低，额度须更高。
             */
            benefit: string;
          },
          ...{
            meter: Text;
            measure: Measure;
            per: Text;
            /**
             * 同渠道、同计费项及同单位的通常费率或额度；通常额度可为 0。
             */
            regular?: string;
            /**
             * 相同时点的实际优惠费率或额度；若有通常值，费用／积分须更低，额度须更高。
             */
            benefit: string;
          }[]
        ];
      }
    | {
        kind: "multiplier";
        target: "price" | "credits" | "quota";
        unit: Text;
        /**
         * 费用／积分倍数低于 1，额度倍数高于 1；0 表示免费但仍需来源明确支持。
         */
        value: string;
      }
    | {
        kind: "unresolved";
      };
  /**
   * 仅记录官方明确说明的同渠道权益组合关系；缺省不表示自动叠加。
   */
  combinationRelations?: CombinationRelation[];
}
/**
 * 时间条件约束的事件类别，不等于用于判价的精确瞬间。已知类别应明确记录；billing_posted 仅表示来源明确以出账事件的发生时间判断该项权益，不推广为渠道通用规则，也不等于用量发生时间；订阅下单不等于付款时刻。来源未说明事件类别时用 unknown，不从权益 ID 或营销文案猜测；不同计费项若对应不同事件，应拆成不同权益。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "timeTrigger".
 */
export interface TimeTrigger {
  kind:
    | "model_request"
    | "payment"
    | "claim"
    | "tool_call"
    | "metered_usage"
    | "billing_posted"
    | "subscription_order"
    | "unknown";
}
/**
 * 重复时段按开始日归属；跨午夜结束时间可以早于开始时间。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "localWindow".
 */
export interface LocalWindow {
  /**
   * ISO 星期数，周一为 1、周日为 7；跨午夜时取开始日期的星期。
   *
   * @minItems 1
   * @maxItems 7
   */
  weekdays:
    | [number]
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | [number, number, number, number, number]
    | [number, number, number, number, number, number]
    | [number, number, number, number, number, number, number];
  start: StartTime;
  /**
   * 24:00 仅用于时段结束；全天用 00:00–24:00。
   */
  end: string;
}
/**
 * 只有已公布的日历例外才能写入；coveredYears 外不能假定不存在节假日或特别窗口。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "calendarExceptions".
 */
export interface CalendarExceptions {
  /**
   * 已据官方日历核实例外的年份；未列年份保持待核实。
   *
   * @minItems 1
   */
  coveredYears: [number, ...number[]];
  /**
   * 指定日期的窗口替换通常窗口；空窗口表示该日没有这项权益。
   */
  overrides: {
    date: Date;
    windows: DateWindow[];
  }[];
  sourceReferences: SourceReferences1;
}
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "dateWindow".
 */
export interface DateWindow {
  start: StartTime;
  end: EndTime;
}
/**
 * 仅引用同一计费渠道的另一项权益，且关系本身也需要直接出处。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "combinationRelation".
 */
export interface CombinationRelation {
  /**
   * exclusive 为互斥，stackable 为可叠加，overrides 表示本文件权益覆盖所引用的另一权益。
   */
  relation: "exclusive" | "stackable" | "overrides";
  /**
   * 关系另一端在同一计费渠道内的权益 ID。
   */
  otherBenefitId: string;
  sourceReferences: SourceReferences2;
}
