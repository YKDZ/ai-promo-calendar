/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */

/**
 * 至少一个可直接追溯的 HTTP(S) URL；Schema 只检查形式，不判断网页权威性或内容。
 *
 * @minItems 1
 */
export type SourceReferences = [string, ...string[]];
/**
 * 每一项都必须是必要资格谓词：该谓词为假时权益不适用。同一字段在一项权益中只出现一次；one_of／none_of 可由查询者按字段判断，one_of 可把有明确冲突的候选值局部标为不确定。只有无法用现有字段枚举、但人仍可判断真假的资格才使用 text。
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
      /**
       * 说明 uncertainValues 为何不能确定；局部资格冲突不应污染整项权益的 evidenceStatus。
       */
      uncertaintyReason?: string;
    }
  | {
      kind: "none_of";
      field: EligibilityField;
      /**
       * @minItems 1
       */
      values: [Text, ...Text[]];
    }
  | {
      kind: "text";
      /**
       * 应能改写成针对一次具体查询的是／否问题；若答案为否，这项权益即不适用。
       */
      description: string;
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
 * 时间条件约束的是哪类事件，并且必须适用于本文件效果覆盖的所有计费项；不同计费项若按不同事件判价，必须拆成不同权益。领取或支付窗口不等于到账后权益的使用期。无法从公开资料确定或不能归入前三类时，用带具体说明的 other，不得猜测。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "timeTrigger".
 */
export type TimeTrigger =
  | {
      kind: "model_request" | "payment" | "claim";
    }
  | {
      kind: "other";
      /**
       * 说明实际事件，或说明公开资料为何不足以判定事件。
       */
      description: string;
    };
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "dateTime".
 */
export type DateTime = string;
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "startTime".
 */
export type StartTime = string;
/**
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "date".
 */
export type Date = string;
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
 * 保存已知政策窗口，不因局部边界未知而丢弃其余时段。absolute 用于有起止时刻的区间，recurring 用于时区内重复窗口，unresolved 仅用于无法结构化任何可用窗口的原文。
 *
 * This interface was referenced by `TimedBenefit`'s JSON-Schema
 * via the `definition` "timeCondition".
 */
export type TimeCondition =
  | {
      kind: "absolute";
      startsAt: DateTime;
      endsAt: DateTime;
      /**
       * 明确包含结束时刻为 true，明确不包含为 false；只有包含性未说明时为 null，此时需记录来源精度和原因，不能让整个区间 unresolved。
       */
      endInclusive: boolean | null;
      /**
       * 仅在 endInclusive 为 null 时填写；查询在 endsAt 起的相应日、分钟或秒内应标待核实，不能推断结束瞬间。
       */
      endPrecision?: "day" | "minute" | "second";
      /**
       * 仅在 endInclusive 为 null 时说明为何无法确定结束边界；不得因该局部疑点隐藏整个已知区间。
       */
      endUncertaintyReason?: string;
    }
  | {
      kind: "recurring";
      /**
       * 仅在有出处时填可识别的 IANA 时区，如 Asia/Shanghai。
       */
      timeZone: string;
      /**
       * 保留官方对时区的原始称呼，供复核映射。
       */
      sourceTimeZoneText: string;
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
      calendarExceptions?: CalendarExceptions;
    }
  | {
      kind: "unresolved";
      publishedText: Text;
      /**
       * 说明缺少哪项公开事实，不能把 unresolved 当作确定时段。
       */
      reason: string;
    };
/**
 * 来源同时公布同一计费项的通常值与优惠值时优先使用 unit_rate；只有一个倍数对本文件全部适用条件和明确计费项都精确成立时才使用 multiplier。宣传折扣名称或展示舍入不能代替实际可计算费率；效果不足以计算时使用 unresolved。
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
          regular: string;
          /**
           * 相同时点优惠后的费率或额度；费用／积分须更低，额度须更高。
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
          regular: string;
          /**
           * 相同时点优惠后的费率或额度；费用／积分须更低，额度须更高。
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
      publishedText: Text;
      reason: Text;
    };

/**
 * 一份文件记录一项可独立求值的时段权益，而不是笼统对应一张营销活动页面。文件内全部适用情形必须共享同一政策触发事件和同一可计算效果范围；套餐档位、计费项或触发事件导致效果不同时拆成不同权益。
 */
export interface TimedBenefit {
  $schema: "../../schema/benefit.schema.json";
  schemaVersion: 1;
  /**
   * 实际负责计费的使用渠道 ID，必须与所在目录及渠道记录一致；模型品牌不是计费渠道。
   */
  accessChannelId: string;
  /**
   * 同一渠道内稳定的权益 ID，必须与文件名一致。
   */
  id: string;
  /**
   * 便于人识别这项独立权益的简短名称，不应代替完整条款。
   */
  title: string;
  /**
   * supported 表示当前采纳的公开资料支持本记录；uncertain 表示来源失联或冲突，不能当作确定生效。它不是任务分派状态。
   */
  evidenceStatus: "supported" | "uncertain";
  /**
   * 仅在 evidenceStatus 为 uncertain 时填写来源为何不足以支持确定陈述。
   */
  uncertaintyReason?: string;
  sourceReferences: SourceReferences;
  /**
   * 所有条件同时成立才可能适用；数组成员只能是必要资格谓词，不是备注。仅在来源明确覆盖该渠道所有情形时使用空数组。
   */
  eligibilityConditions: EligibilityCondition[];
  timeTrigger: TimeTrigger;
  /**
   * 政策触发事件的时间窗口；有已知窗口但某个边界、年份或账号状态不明时保留已知部分，勿把整条规则标为 unresolved。
   */
  timeCondition:
    | {
        kind: "absolute";
        startsAt: DateTime;
        endsAt: DateTime;
        /**
         * 明确包含结束时刻为 true，明确不包含为 false；只有包含性未说明时为 null，此时需记录来源精度和原因，不能让整个区间 unresolved。
         */
        endInclusive: boolean | null;
        /**
         * 仅在 endInclusive 为 null 时填写；查询在 endsAt 起的相应日、分钟或秒内应标待核实，不能推断结束瞬间。
         */
        endPrecision?: "day" | "minute" | "second";
        /**
         * 仅在 endInclusive 为 null 时说明为何无法确定结束边界；不得因该局部疑点隐藏整个已知区间。
         */
        endUncertaintyReason?: string;
      }
    | {
        kind: "recurring";
        /**
         * 仅在有出处时填可识别的 IANA 时区，如 Asia/Shanghai。
         */
        timeZone: string;
        /**
         * 保留官方对时区的原始称呼，供复核映射。
         */
        sourceTimeZoneText: string;
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
        calendarExceptions?: CalendarExceptions;
      }
    | {
        kind: "unresolved";
        publishedText: Text;
        /**
         * 说明缺少哪项公开事实，不能把 unresolved 当作确定时段。
         */
        reason: string;
      };
  /**
   * 仅以自然语言保存取得权益之后的公开有效期规则，例如‘每笔奖励自领取之日起 30 天有效’；不参与时点求值，也不得补充或覆盖时间、触发事件、资格或效果字段。
   */
  entitlementValidityNote?: string;
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
            regular: string;
            /**
             * 相同时点优惠后的费率或额度；费用／积分须更低，额度须更高。
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
            regular: string;
            /**
             * 相同时点优惠后的费率或额度；费用／积分须更低，额度须更高。
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
        publishedText: Text;
        reason: Text;
      };
  /**
   * 仅记录官方明确说明的同渠道权益组合关系；缺省不表示自动叠加。
   */
  combinationRelations?: CombinationRelation[];
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
