/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */

/**
 * 对本使用渠道的费用或额度规则负责的主体名称，不一定是所用模型的研发方；此处不另造无可核对目标的服务商 ID。
 *
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "billingProvider".
 */
export type BillingProvider = string;
/**
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "text".
 */
export type Text = string;
/**
 * 直接支持渠道身份、计费主体和适用范围的公开 URL，不等于该渠道每项权益的证据。
 *
 * @minItems 1
 *
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "sourceReferences".
 */
export type SourceReferences = [string, ...string[]];
/**
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "id".
 */
export type Id = string;

/**
 * 一个实际负责计费或额度扣减的使用渠道；与模型研发方、其他套餐或独立代理渠道分别记录。
 */
export interface ChannelRecord {
  $schema: "../schema/channel.schema.json";
  schemaVersion: 2;
  billingProvider: BillingProvider;
  accessChannel: AccessChannel;
  sourceReferences: SourceReferences;
  /**
   * 仅在计费方明确说明渠道通用地以请求的何时刻判定费率时填写；单项权益的触发事件和政策窗口不推定整个渠道的判定时刻，其他机制应先扩展契约。
   */
  billingDecisionInstant?: {
    kind: "request_started" | "server_received";
    sourceReferences: SourceReferences;
  };
}
/**
 * 按该主体条款付费或扣减额度的渠道；独立 API 与不同套餐不要因模型名相同而合并。
 *
 * This interface was referenced by `ChannelRecord`'s JSON-Schema
 * via the `definition` "accessChannel".
 */
export interface AccessChannel {
  /**
   * 稳定渠道 ID，必须与文件名以及权益文件的 accessChannelId 一致。
   */
  id: string;
  name: Text;
  /**
   * metered_api 为按量 API；plan 为订阅或额度套餐；other 仅用于确实不同的计费方式。
   */
  kind: "metered_api" | "plan" | "other";
}
