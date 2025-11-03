// 测试表格配置（允许在运行时被覆盖，用于集成场景）
export type TestTableConfig = {
  spaceId?: string
  baseId?: string
  tableId?: string
}

export let testTableConfig: TestTableConfig = {
  spaceId: 'spc_qu7dcVtr0NUBoBLj2V12B',
  baseId: 'c3066c07-e552-4124-ab20-2f91e85ac892',
  tableId: 'tbl_ACim5B5rGAv4RfKqV9M9f',
}

export function setTestTableConfig(partial: TestTableConfig) {
  testTableConfig = { ...testTableConfig, ...partial }
}
