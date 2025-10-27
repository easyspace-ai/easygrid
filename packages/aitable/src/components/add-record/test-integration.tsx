/**
 * AddRecordDialog 集成测试
 * 用于验证在 StandardDataView 中的集成是否正常工作
 */

import React, { useState } from 'react';
import { AddRecordDialog } from './AddRecordDialog';
import type { FieldConfig } from './types';

// 测试数据
const testFields: FieldConfig[] = [
  {
    id: '1',
    name: '姓名',
    type: 'text',
    required: true,
    isPrimary: true,
    description: '请输入姓名',
  },
  {
    id: '2',
    name: '年龄',
    type: 'number',
    required: false,
    options: {
      min: 0,
      max: 120,
    },
  },
  {
    id: '3',
    name: '邮箱',
    type: 'email',
    required: true,
    description: '请输入有效的邮箱地址',
  },
  {
    id: '4',
    name: '生日',
    type: 'date',
    required: false,
  },
  {
    id: '5',
    name: '激活状态',
    type: 'checkbox',
    required: false,
  },
];

// 模拟 SDK
const mockSDK = {
  createRecord: async (tableId: string, data: any) => {
    console.log('📝 Mock SDK createRecord called:', { tableId, data });
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `rec_${Date.now()}`,
      fields: data.fields,
      createdTime: new Date().toISOString(),
    };
  },
};

export function TestAddRecordIntegration() {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  const handleSuccess = (record: any) => {
    console.log('✅ Record created successfully:', record);
    setRecords(prev => [record, ...prev]);
    setIsOpen(false);
  };

  const handleError = (error: Error) => {
    console.error('❌ Record creation failed:', error);
    alert(`保存失败: ${error.message}`);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>AddRecordDialog 集成测试</h2>
      
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        测试添加记录
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>已创建的记录 ({records.length})</h3>
        {records.length === 0 ? (
          <p>暂无记录</p>
        ) : (
          <div>
            {records.map((record, index) => (
              <div key={record.id} style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#f5f5f5' }}>
                <strong>记录 {index + 1}:</strong>
                <pre>{JSON.stringify(record, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <AddRecordDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fields={testFields}
        tableId="test-table-001"
        adapter={mockSDK}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

export default TestAddRecordIntegration;
