/**
 * Field Configuration Components
 * 字段配置组件
 */

// 对话框组件
export { AddFieldDialog } from './AddFieldDialog';
export { AddFieldDialog as AddFieldDialogV2 } from './AddFieldDialog.v2';
export { AddFieldMenu } from './AddFieldMenu';
export { EditFieldMenu } from './EditFieldMenu';
export { EditFieldDialog } from './EditFieldDialog';
export { EnhancedEditFieldDialog } from './EnhancedEditFieldDialog';
export { EnhancedDeleteConfirmDialog } from './EnhancedDeleteConfirmDialog';
export { FieldManagementProvider, useFieldManagement } from './FieldManagementProvider';

// 配置面板组件
export { FieldConfigPanel } from './FieldConfigPanel';
export { FieldConfigCombobox } from './FieldConfigCombobox';
export { FieldContextMenu } from './FieldContextMenu';

// 字段配置工具
export * from './field-configurations';

// 类型导出
export type { AddFieldDialogProps } from './AddFieldDialog';
export type { EditFieldDialogProps, FieldConfig as EditFieldConfig } from './EditFieldDialog';
export type { FieldTypeConfig } from './AddFieldDialog.v2';
export type { EnhancedEditFieldDialogProps } from './EnhancedEditFieldDialog';
export type { EnhancedDeleteConfirmDialogProps } from './EnhancedDeleteConfirmDialog';
export type { FieldContextMenuProps } from './FieldContextMenu';
export type { FieldConfigComboboxProps } from './FieldConfigCombobox';
export type { FieldConfigPanelProps } from './FieldConfigPanel';
export type { FieldConfig } from './FieldConfigPanel';
