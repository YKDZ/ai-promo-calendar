/**
 * 本文件由 scripts/generate-types.ts 从 JSON Schema 自动生成。
 * 请勿手动修改；请修改对应 Schema 后运行 pnpm generate:types。
 */

/**
 * 供维护者巡查新活动的公开文档、价目表、更新日志和索引。入口只是搜索线索，本文件不声明任何时段权益生效。
 */
export interface DiscoveryCatalog {
  $schema: "schema/discovery.schema.json";
  schemaVersion: 1;
  /**
   * 维护者应逐项查看并继续搜索更广的一手来源；不得把清单完整性当作所有优惠已收录的保证。
   */
  entries: {
    /**
     * 入口的简短名称，说明实际计费渠道或文档集合。
     */
    title: string;
    /**
     * 值得广泛巡查的公开文档入口；若它载明具体权益，也必须另在权益记录中引用。
     */
    url: string;
    /**
     * 说明该入口适合调查什么，及不能从它直接推断什么。
     */
    description: string;
  }[];
}
