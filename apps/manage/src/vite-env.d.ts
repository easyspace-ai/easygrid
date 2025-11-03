/// <reference types="vite/client" />

// 解决本地工作区消费内部包时的类型解析告警
declare module '@easygrid/grid' {
  export const EasyGridPro: any
  export const DataGrid: any
  export const DataGridToolbar: any
  export const useDataGrid: any
}
