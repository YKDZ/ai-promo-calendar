/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */

/**
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "text".
 */
export type Text = string;
/**
 * 直接支持渠道身份、计费主体和适用范围的公开 URL，不等于该渠道每项权益的证据。
 *
 * @minItems 1
 */
export type SourceReferences = [string, ...string[]];
/**
 * @minItems 1
 *
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "sourceReferences".
 */
export type SourceReferences1 = [string, ...string[]];
/**
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "id".
 */
export type Id = string;

/**
 * 一个文件对应一个实际承担计费规则的使用渠道，即使该渠道当前没有时段权益也可保留。模型研发方与计费方可能不同。
 */
export interface ChannelRecord {
  $schema: "../schema/channel.schema.json";
  schemaVersion: 1 | 2;
  /**
   * 对本使用渠道的费用或额度规则负责的主体名称，不一定是所用模型的研发方；此处不另造无可核对目标的服务商 ID。
   */
  billingProvider: string;
  /**
   * 按该主体条款付费或扣减额度的渠道；独立 API 与不同套餐不要因模型名相同而合并。
   */
  accessChannel: {
    /**
     * 稳定渠道 ID，必须与文件名以及权益文件的 accessChannelId 一致。
     */
    id: string;
    name: Text;
    /**
     * metered_api 为按量 API；plan 为订阅或额度套餐；other 仅用于确实不同的计费方式。
     */
    kind: "metered_api" | "plan" | "other";
  };
  sourceReferences: SourceReferences;
  /**
   * 仅在计费方明确说明以何时刻判定请求费率时填写；政策窗口不推定最终账单时刻。
   */
  billingDecisionInstant?: {
    kind: "request_started" | "server_received" | "other";
    description?: Text;
    sourceReferences: SourceReferences1;
  };
}
