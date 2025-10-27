import { useRef, useState, useImperativeHandle } from 'react';
import type { ForwardRefRenderFunction } from 'react';
import { forwardRef } from 'react';
import type { IGridColumn } from '../../types/grid';
import type { IFieldType } from '../field/FieldTypeSelector';
import { FieldTypeSelector, type IFieldTypeSelectorRef } from '../field/FieldTypeSelector';
import { ColumnContextMenu, type IColumnContextMenuRef } from '../context-menu/ColumnContextMenu';
import { FieldPropertyEditor, type IFieldPropertyEditorRef } from '../field/FieldPropertyEditor';
import {
  FieldTypeSelectModal,
  type IFieldTypeSelectModalRef,
  type IFieldTypeModal,
} from '../field/FieldTypeSelectModal';
import type {
  IFormulaFieldConfigOptions,
  IRollupFieldConfigOptions,
} from '../field/VirtualFieldConfig';
import {
  DeleteConfirmDialog,
  type IDeleteConfirmDialogRef,
  type DeleteType,
} from '../dialogs/DeleteConfirmDialog';
// import { useFieldManagement } from '../../../components/field-config/FieldManagementProvider';

export interface IColumnManagementRef {
  showFieldTypeSelector: (position: { x: number; y: number }) => void;
  showColumnContextMenu: (position: { x: number; y: number }, columnIndex: number) => void;
  showFieldPropertyEditor: (
    column: IGridColumn,
    columnIndex: number,
    position?: { x: number; y: number; width?: number }
  ) => void;
  showFieldTypeSelectModal: (
    position?: { x: number; y: number },
    mode?: 'create' | 'edit',
    initialData?: {
      type?: IFieldTypeModal;
      name?: string;
      options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions;
    }
  ) => void;
  hideAll: () => void;
}

export interface IColumnManagementProps {
  columns: IGridColumn[];
  onColumnsChange?: (columns: IGridColumn[]) => void;
  onAddColumn?: (
    fieldType: IFieldType,
    insertIndex?: number,
    fieldName?: string,
    options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions
  ) => void;
  onEditColumn?: (columnIndex: number, updatedColumn: IGridColumn) => void;
  onDuplicateColumn?: (columnIndex: number) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  onInsertColumnLeft?: (
    columnIndex: number,
    fieldType: IFieldType,
    fieldName?: string,
    options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions
  ) => void;
  onInsertColumnRight?: (
    columnIndex: number,
    fieldType: IFieldType,
    fieldName?: string,
    options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions
  ) => void;
  // 新增：当用户点击"编辑字段"时优先回调，由上层自行展示编辑弹窗
  onStartEditColumn?: (columnIndex: number, column: IGridColumn) => void;
}

const ColumnManagementBase: ForwardRefRenderFunction<
  IColumnManagementRef,
  IColumnManagementProps
> = (props, ref) => {
  const {
    columns,
    onColumnsChange,
    onAddColumn,
    onEditColumn,
    onDuplicateColumn,
    onDeleteColumn,
    onInsertColumnLeft,
    onInsertColumnRight,
    onStartEditColumn,
  } = props;

  // 使用增强的字段管理功能 - 暂时禁用
  // const { openEditDialog, openDeleteDialog } = useFieldManagement();

  const fieldTypeSelectorRef = useRef<IFieldTypeSelectorRef>(null);
  const columnContextMenuRef = useRef<IColumnContextMenuRef>(null);
  const fieldPropertyEditorRef = useRef<IFieldPropertyEditorRef>(null);
  const fieldTypeSelectModalRef = useRef<IFieldTypeSelectModalRef>(null);
  const deleteConfirmDialogRef = useRef<IDeleteConfirmDialogRef>(null);

  const [pendingColumnIndex, setPendingColumnIndex] = useState<number>(-1);

  // 暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    showFieldTypeSelector: (position: { x: number; y: number }) => {
      setPendingColumnIndex(-1); // 添加到末尾
      fieldTypeSelectorRef.current?.show(position);
    },
    showColumnContextMenu: (position: { x: number; y: number }, columnIndex: number) => {
      columnContextMenuRef.current?.show(position, columnIndex);
    },
    showFieldPropertyEditor: (
      column: IGridColumn,
      columnIndex: number,
      position?: { x: number; y: number; width?: number }
    ) => {
      fieldPropertyEditorRef.current?.show(column, columnIndex, position);
    },
    showFieldTypeSelectModal: (position = { x: 100, y: 100 }, mode = 'create', initialData) => {
      fieldTypeSelectModalRef.current?.show(position, mode, initialData);
    },
    hideAll: () => {
      fieldTypeSelectorRef.current?.hide();
      columnContextMenuRef.current?.hide();
      fieldPropertyEditorRef.current?.hide();
      fieldTypeSelectModalRef.current?.hide();
      deleteConfirmDialogRef.current?.hide();
    },
  }));

  // 字段类型选择器事件处理
  const handleFieldTypeSelect = (fieldType: IFieldType) => {
    if (pendingColumnIndex >= 0) {
      // 在指定位置插入
      onInsertColumnLeft?.(pendingColumnIndex, fieldType);
      onInsertColumnRight?.(pendingColumnIndex, fieldType);
    } else {
      // 添加到末尾
      onAddColumn?.(fieldType);
    }
    setPendingColumnIndex(-1);
  };

  const handleFieldTypeCancel = () => {
    setPendingColumnIndex(-1);
  };

  // 字段类型选择弹窗事件处理
  const handleFieldTypeSelectModalConfirm = (data: {
    type: IFieldTypeModal;
    name: string;
    options?: IFormulaFieldConfigOptions | IRollupFieldConfigOptions;
  }) => {
    // 转换字段类型格式
    const fieldType = data.type as IFieldType;

    if (pendingColumnIndex >= 0) {
      // 在指定位置插入
      onInsertColumnLeft?.(pendingColumnIndex, fieldType, data.name, data.options);
      onInsertColumnRight?.(pendingColumnIndex, fieldType, data.name, data.options);
    } else {
      // 添加到末尾
      onAddColumn?.(fieldType, undefined, data.name, data.options);
    }
    setPendingColumnIndex(-1);
  };

  const handleFieldTypeSelectModalCancel = () => {
    setPendingColumnIndex(-1);
  };

  // 列右键菜单事件处理
  const handleEditField = (columnIndex: number) => {
    const column = columns[columnIndex];
    if (column) {
      // 若外部提供了开始编辑的回调，则交给外部处理（用于自定义弹窗）
      if (onStartEditColumn) {
        onStartEditColumn(columnIndex, column);
        return;
      }
      // 使用增强的字段编辑对话框
      const fieldConfig = {
        id: column.id || `column-${columnIndex}`,
        name: column.name,
        type: (column as any).type || 'singleLineText',
        description: (column as any).description || '',
        required: (column as any).required || false,
        visible: (column as any).visible !== false,
        options: (column as any).options || [],
        defaultValue: (column as any).defaultValue || '',
        validation: (column as any).validation || {},
      };
      // openEditDialog(fieldConfig); // 暂时禁用
    }
  };

  const handleDuplicateField = (columnIndex: number) => {
    onDuplicateColumn?.(columnIndex);
  };

  const handleInsertFieldLeft = (columnIndex: number) => {
    setPendingColumnIndex(columnIndex);
    // 使用新的字段类型选择弹窗
    fieldTypeSelectModalRef.current?.show({ x: 100, y: 100 }, 'create');
  };

  const handleInsertFieldRight = (columnIndex: number) => {
    setPendingColumnIndex(columnIndex + 1);
    // 使用新的字段类型选择弹窗
    fieldTypeSelectModalRef.current?.show({ x: 100, y: 100 }, 'create');
  };

  const handleFilterByField = (columnIndex: number) => {
    // TODO: 实现筛选功能
  };

  const handleSortByField = (columnIndex: number) => {
    // TODO: 实现排序功能
  };

  const handleGroupByField = (columnIndex: number) => {
    // TODO: 实现分组功能
  };

  const handleFreezeToField = (columnIndex: number) => {
    // TODO: 实现冻结功能
  };

  const handleHideField = (columnIndex: number) => {
    // TODO: 实现隐藏字段功能
  };

  const handleDeleteField = (columnIndex: number) => {
    console.log('🗑️ handleDeleteField 被调用:', { columnIndex, column: columns[columnIndex] });
    const column = columns[columnIndex];
    if (column) {
      console.log('🗑️ 准备显示增强删除确认对话框:', { columnIndex, columnName: column.name });
      // 使用增强的删除确认对话框
      // openDeleteDialog(column.id || `column-${columnIndex}`, column.name); // 暂时禁用
    } else {
      console.error('🗑️ 无法找到要删除的列:', columnIndex);
    }
  };

  const handleDeleteConfirm = (type: DeleteType, itemIndex: number) => {
    if (type === 'column') {
      onDeleteColumn?.(itemIndex);
    }
    // 行删除由Grid组件处理
  };

  // 字段属性编辑器事件处理
  const handleFieldPropertySave = (columnIndex: number, updatedColumn: IGridColumn) => {
    // 新建字段：当传入的索引等于当前列数，视为插入到末尾
    if (columnIndex >= columns.length) {
      const type = (updatedColumn as any).type;
      const fieldType = {
        type,
        name: updatedColumn.name || '新字段',
        description: updatedColumn.description || '',
        icon: (updatedColumn as any).icon || 'A',
      } as unknown as IFieldType;
      onAddColumn?.(fieldType);
      return;
    }
    // 编辑已有字段
    onEditColumn?.(columnIndex, updatedColumn);
  };

  const handleFieldPropertyCancel = () => {
    // 取消编辑
  };

  return (
    <>
      <FieldTypeSelector
        ref={fieldTypeSelectorRef}
        onSelect={handleFieldTypeSelect}
        onCancel={handleFieldTypeCancel}
      />

      <ColumnContextMenu
        ref={columnContextMenuRef}
        onEditField={handleEditField}
        onDuplicateField={handleDuplicateField}
        onInsertFieldLeft={handleInsertFieldLeft}
        onInsertFieldRight={handleInsertFieldRight}
        onFilterByField={handleFilterByField}
        onSortByField={handleSortByField}
        onGroupByField={handleGroupByField}
        onFreezeToField={handleFreezeToField}
        onHideField={handleHideField}
        onDeleteField={handleDeleteField}
      />

      <FieldPropertyEditor
        ref={fieldPropertyEditorRef}
        onSave={handleFieldPropertySave}
        onCancel={handleFieldPropertyCancel}
      />

      <FieldTypeSelectModal
        ref={fieldTypeSelectModalRef}
        onConfirm={handleFieldTypeSelectModalConfirm}
        onCancel={handleFieldTypeSelectModalCancel}
      />

      <DeleteConfirmDialog ref={deleteConfirmDialogRef} onConfirm={handleDeleteConfirm} />
    </>
  );
};

export const ColumnManagement = forwardRef(ColumnManagementBase);
