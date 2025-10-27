/**
 * Field Management Example Component
 * 字段管理使用示例组件
 * 展示如何集成增强的字段编辑和删除功能
 */

import React, { useState, useCallback } from 'react';
import { FieldManagementProvider, useFieldManagement } from './FieldManagementProvider';
import { FieldProvider, useField } from '../../context/field/FieldContext';
import { ApiClient } from '../../api/client';
import type { FieldConfig } from './EditFieldDialog';

// 模拟字段数据
const mockFields: FieldConfig[] = [
  {
    id: 'field-1',
    name: '姓名',
    type: 'singleLineText',
    description: '用户姓名',
    required: true,
    visible: true,
    options: [],
    defaultValue: '',
    validation: {},
  },
  {
    id: 'field-2',
    name: '年龄',
    type: 'number',
    description: '用户年龄',
    required: false,
    visible: true,
    options: [],
    defaultValue: '',
    validation: { min: 0, max: 120 },
  },
  {
    id: 'field-3',
    name: '性别',
    type: 'singleSelect',
    description: '用户性别',
    required: true,
    visible: true,
    options: ['男', '女', '其他'],
    defaultValue: '',
    validation: {},
  },
];

// 字段列表组件
function FieldList() {
  const { fields } = useField();
  const { openEditDialog, openDeleteDialog } = useFieldManagement();
  const [selectedField, setSelectedField] = useState<FieldConfig | null>(null);

  const handleEditField = useCallback(
    (field: FieldConfig) => {
      setSelectedField(field);
      openEditDialog(field);
    },
    [openEditDialog]
  );

  const handleDeleteField = useCallback(
    (field: FieldConfig) => {
      openDeleteDialog(field.id, field.name);
    },
    [openDeleteDialog]
  );

  const handleFieldUpdated = useCallback((updatedField: FieldConfig) => {
    console.log('✅ 字段已更新:', updatedField);
    setSelectedField(null);
  }, []);

  const handleFieldDeleted = useCallback((fieldId: string) => {
    console.log('🗑️ 字段已删除:', fieldId);
  }, []);

  const handleError = useCallback((error: Error, operation: 'edit' | 'delete') => {
    console.error(`❌ 字段${operation === 'edit' ? '编辑' : '删除'}失败:`, error);
  }, []);

  return (
    <FieldManagementProvider
      onFieldUpdated={handleFieldUpdated}
      onFieldDeleted={handleFieldDeleted}
      onError={handleError}
    >
      <div style={{ padding: '20px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '24px', fontWeight: 600 }}>字段管理示例</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {fields.map((field) => (
            <div
              key={field.id}
              style={{
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '4px',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: '#f3f4f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#374151',
                    }}
                  >
                    {field.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                      {field.name}
                    </div>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {field.description || '无描述'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      backgroundColor: '#f3f4f6',
                      borderRadius: '4px',
                      fontSize: '12px',
                      color: '#374151',
                    }}
                  >
                    {field.type}
                  </span>
                  {field.required && (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#fef3c7',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#92400e',
                      }}
                    >
                      必填
                    </span>
                  )}
                  {!field.visible && (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#f3f4f6',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#6b7280',
                      }}
                    >
                      隐藏
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => handleEditField(field)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                    e.currentTarget.style.borderColor = '#9ca3af';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteField(field)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: '#dc2626',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.borderColor = '#f87171';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#fecaca';
                  }}
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </FieldManagementProvider>
  );
}

// 主示例组件
export function FieldManagementExample() {
  // 模拟 API 客户端
  const apiClient = new ApiClient('http://localhost:2345');

  return (
    <FieldProvider tableId="example-table" apiClient={apiClient}>
      <FieldList />
    </FieldProvider>
  );
}
