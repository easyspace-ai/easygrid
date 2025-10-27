/**
 * StandardDataViewV3 使用示例
 * 
 * 展示如何使用新的 StandardDataViewV3 组件集成 LuckDB SDK
 */

import React, { useState, useEffect } from 'react';
import { StandardDataViewV3 } from './StandardDataView.v3';
import { LuckDB } from '@easygrid/sdk';
import type { IGridColumn } from '../grid/core/Grid';

/**
 * 示例 1: 基础用法 - 使用 LuckDB SDK
 */
export function Example1_BasicUsage() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [tableId, setTableId] = useState<string>('');
  const [columns, setColumns] = useState<IGridColumn[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化 SDK
  useEffect(() => {
    const initSDK = async () => {
      const luckdb = new LuckDB({
        baseUrl: 'http://localhost:8888',
        debug: true,
      });

      // 登录
      await luckdb.login({
        email: 'admin@126.com',
        password: 'Pmker123',
      });

      setSdk(luckdb);
    };

    initSDK();
  }, []);

  // 加载数据
  const loadData = async () => {
    if (!sdk || !tableId) return;

    try {
      setLoading(true);

      // 获取字段
      const fields = await sdk.listFields({ tableId });
      const gridColumns: IGridColumn[] = fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        width: 150,
        resizable: true,
      }));
      setColumns(gridColumns);

      // 获取记录
      const records = await sdk.listRecords({ tableId });
      const gridData = records.data.map((record) => ({
        id: record.id,
        ...record.data,
      }));
      setData(gridData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen">
      <StandardDataViewV3
        // SDK 配置
        sdk={sdk}
        tableId={tableId}
        
        // Grid 配置
        gridProps={{
          columns,
          data,
          rowCount: data.length,
          onDataRefresh: loadData,
        }}
        
        // 状态
        state={loading ? 'loading' : data.length === 0 ? 'empty' : 'idle'}
        loadingMessage="加载数据中..."
        
        // 工具栏配置
        toolbarConfig={{
          showAddNew: true,
          showFieldConfig: true,
          showRowHeight: true,
          showFilter: true,
        }}
      />
    </div>
  );
}

/**
 * 示例 2: 完整功能 - 带视图管理
 */
export function Example2_WithViewManagement() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [tableId] = useState<string>('tbl_example123');
  const [columns, setColumns] = useState<IGridColumn[]>([]);
  const [data, setData] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);

  // 数据加载函数
  const loadTableData = async () => {
    if (!sdk || !tableId) return;

    try {
      // 加载字段
      const fieldsList = await sdk.listFields({ tableId });
      setFields(fieldsList);

      const gridColumns: IGridColumn[] = fieldsList.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type as any,
        width: 150,
      }));
      setColumns(gridColumns);

      // 加载记录
      const records = await sdk.listRecords({ tableId, limit: 100 });
      const gridData = records.data.map((record) => ({
        id: record.id,
        ...record.data,
      }));
      setData(gridData);
    } catch (error) {
      console.error('加载失败:', error);
    }
  };

  useEffect(() => {
    if (sdk && tableId) {
      loadTableData();
    }
  }, [sdk, tableId]);

  return (
    <div className="h-screen w-screen">
      <StandardDataViewV3
        // SDK 和表格配置
        sdk={sdk}
        tableId={tableId}
        
        // 字段配置
        fields={fields.map((f) => ({
          id: f.id,
          name: f.name,
          type: f.type,
          visible: true,
        }))}
        fieldConfigMode="combobox"
        
        // 行高配置
        rowHeight="medium"
        onRowHeightChange={(height) => {
          console.log('行高变更为:', height);
        }}
        
        // Grid 配置
        gridProps={{
          columns,
          data,
          rowCount: data.length,
          onDataRefresh: loadTableData,
          onCellEdit: async (cell, newValue) => {
            // 单元格编辑
            const recordId = data[cell.rowIndex].id;
            const fieldId = columns[cell.colIndex].id;
            await sdk?.updateRecord(tableId, recordId, {
              data: { [fieldId]: newValue },
            });
            await loadTableData();
          },
        }}
        
        // 视图管理（组件会自动加载视图）
        onViewChange={(viewId) => {
          console.log('切换到视图:', viewId);
        }}
        
        // 工具栏配置
        toolbarConfig={{
          showUndoRedo: true,
          showAddNew: true,
          showFieldConfig: true,
          showRowHeight: true,
          showFilter: true,
          showSort: true,
          showGroup: true,
        }}
        
        // 状态栏
        statusContent={<div>自定义状态信息</div>}
      />
    </div>
  );
}

/**
 * 示例 3: 自定义回调 - 覆盖默认行为
 */
export function Example3_CustomCallbacks() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [tableId] = useState<string>('tbl_example123');

  return (
    <div className="h-screen w-screen">
      <StandardDataViewV3
        sdk={sdk}
        tableId={tableId}
        
        gridProps={{
          columns: [],
          data: [],
          rowCount: 0,
        }}
        
        // 自定义视图创建逻辑
        onCreateView={(viewType) => {
          console.log('创建视图:', viewType);
          // 自定义实现...
        }}
        
        // 自定义视图重命名逻辑
        onRenameView={(viewId, newName) => {
          console.log('重命名视图:', viewId, newName);
          // 自定义实现...
        }}
        
        // 自定义字段添加逻辑
        onAddField={(fieldName, fieldType) => {
          console.log('添加字段:', fieldName, fieldType);
          // 自定义实现...
        }}
        
        // 自定义字段编辑逻辑
        onFieldEdit={(fieldId) => {
          console.log('编辑字段:', fieldId);
          // 自定义实现...
        }}
        
        // 自定义列宽调整
        gridProps={{
          columns: [],
          data: [],
          rowCount: 0,
          onColumnResize: (column, newSize) => {
            console.log('列宽调整:', column.name, newSize);
            // 持久化到后端...
          },
        }}
      />
    </div>
  );
}

/**
 * 示例 4: 响应式布局
 */
export function Example4_ResponsiveLayout() {
  return (
    <div className="h-screen w-screen">
      <StandardDataViewV3
        sdk={null as any}
        tableId="tbl_example123"
        
        gridProps={{
          columns: [],
          data: [],
          rowCount: 0,
        }}
        
        // 响应式配置
        toolbarConfig={{
          // 移动端会自动折叠部分按钮
          showAddNew: true,
          showFieldConfig: true,
          showRowHeight: false, // 移动端隐藏
          showFilter: true,
        }}
      />
    </div>
  );
}

/**
 * 使用说明：
 * 
 * 1. **基础用法**
 *    - 提供 SDK 实例和 tableId
 *    - 组件会自动加载视图数据
 *    - 提供 gridProps 配置表格
 * 
 * 2. **视图管理**
 *    - 组件内置视图管理（加载、创建、重命名、删除）
 *    - 可以通过回调覆盖默认行为
 *    - 支持外部视图列表注入
 * 
 * 3. **字段管理**
 *    - 支持字段配置面板和下拉框两种模式
 *    - 默认通过 SDK 进行字段 CRUD
 *    - 可以通过回调自定义逻辑
 * 
 * 4. **列操作**
 *    - 支持列宽调整和列排序
 *    - 内部状态管理，自动同步到 Grid
 *    - 可以通过回调持久化
 * 
 * 5. **响应式**
 *    - 自动检测设备类型
 *    - 移动端优化布局
 *    - 触摸设备优化
 */


