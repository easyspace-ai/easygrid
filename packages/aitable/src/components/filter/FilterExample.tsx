/**
 * FilterExample - 过滤功能使用示例
 * 
 * 展示如何使用 FilterManager 组件
 */

import React, { useState, useMemo } from 'react';
import { FilterManager, type FilterField, type FilterCondition } from './FilterManager';
import { ViewToolbar } from '../view-toolbar/ViewToolbar';

// 示例数据
const SAMPLE_DATA = [
  { id: 1, name: '张三', age: 25, department: '技术部', salary: 15000, joinDate: '2023-01-15' },
  { id: 2, name: '李四', age: 30, department: '产品部', salary: 18000, joinDate: '2022-08-20' },
  { id: 3, name: '王五', age: 28, department: '技术部', salary: 16000, joinDate: '2023-03-10' },
  { id: 4, name: '赵六', age: 35, department: '市场部', salary: 20000, joinDate: '2021-12-05' },
  { id: 5, name: '钱七', age: 26, department: '技术部', salary: 14000, joinDate: '2023-06-18' },
  { id: 6, name: '孙八', age: 32, department: '产品部', salary: 19000, joinDate: '2022-11-30' },
];

// 字段配置
const SAMPLE_FIELDS: FilterField[] = [
  { id: 'name', name: '姓名', type: 'text' },
  { id: 'age', name: '年龄', type: 'number' },
  { id: 'department', name: '部门', type: 'select', options: ['技术部', '产品部', '市场部', '运营部'] },
  { id: 'salary', name: '薪资', type: 'number' },
  { id: 'joinDate', name: '入职日期', type: 'date' },
];

export function FilterExample() {
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>(SAMPLE_DATA);

  // 处理过滤条件变化
  const handleFilterConditionsChange = (conditions: FilterCondition[]) => {
    setFilterConditions(conditions);
  };

  // 处理过滤结果变化
  const handleFilteredDataChange = (data: any[]) => {
    setFilteredData(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">过滤功能示例</h2>
        
        {/* 工具栏 */}
        <div className="mb-6">
          <ViewToolbar
            config={{
              showFilter: true,
              showSort: true,
              showGroup: true,
            }}
            filterFields={SAMPLE_FIELDS}
            filterConditions={filterConditions}
            onFilterConditionsChange={handleFilterConditionsChange}
            onFilteredDataChange={handleFilteredDataChange}
          />
        </div>

        {/* 过滤状态显示 */}
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium mb-2">当前过滤状态：</h3>
          {filterConditions.length === 0 ? (
            <p className="text-gray-600">无过滤条件，显示全部 {SAMPLE_DATA.length} 条数据</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                已设置 {filterConditions.length} 个过滤条件，显示 {filteredData.length} 条数据
              </p>
              <div className="space-y-1">
                {filterConditions.map((condition, index) => {
                  const field = SAMPLE_FIELDS.find(f => f.id === condition.fieldId);
                  return (
                    <div key={condition.id} className="text-sm text-gray-700">
                      {index + 1}. {field?.name} {condition.operator} {condition.value}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 数据表格 */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">ID</th>
                <th className="border border-gray-300 px-4 py-2 text-left">姓名</th>
                <th className="border border-gray-300 px-4 py-2 text-left">年龄</th>
                <th className="border border-gray-300 px-4 py-2 text-left">部门</th>
                <th className="border border-gray-300 px-4 py-2 text-left">薪资</th>
                <th className="border border-gray-300 px-4 py-2 text-left">入职日期</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="border border-gray-300 px-4 py-2">{item.id}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.age}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.department}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.salary}</td>
                  <td className="border border-gray-300 px-4 py-2">{item.joinDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 使用说明 */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">使用说明：</h3>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• 点击"筛选"按钮打开过滤条件设置对话框</li>
            <li>• 可以添加多个过滤条件，支持不同字段类型</li>
            <li>• 支持文本、数字、日期、选择等字段类型</li>
            <li>• 过滤条件会实时应用到数据上</li>
            <li>• 可以清除所有过滤条件或重置到之前状态</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
