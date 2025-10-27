import { useState, useEffect } from 'react';
import { LuckDB } from '@easygrid/sdk';

/**
 * 实时记录 Hook - 封装 SDK 实时 API
 * 参考 packages/sdk/demo/src/components/RealtimeTable.tsx
 */
export function useRealtimeRecord(
  sdk: LuckDB | null,
  tableId: string,
  recordId: string
) {
  const [record, setRecord] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sdk || !recordId || !tableId) {
      setRecord(null);
      setIsSubscribed(false);
      return;
    }

    let recordClient: any = null;
    let handleSnapshot: any = null;
    let handleOperation: any = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const subscribeToRecord = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. 获取初始数据
        const initialData = await sdk.getRecord(tableId, recordId);
        setRecord(initialData);

        // 2. 等待 ShareDB 连接建立
        const waitForConnection = () => {
          return new Promise<void>((resolve) => {
            const checkConnection = () => {
              if (sdk.getShareDBConnectionState() === 'connected') {
                resolve();
              } else {
                setTimeout(checkConnection, 100);
              }
            };
            checkConnection();
          });
        };

        await waitForConnection();

        // 3. 订阅实时更新
        try {
          recordClient = sdk.realtime.record(tableId, recordId);
          
          // 检查 recordClient 是否有效
          if (!recordClient) {
            throw new Error(`无法创建记录客户端: tableId=${tableId}, recordId=${recordId}`);
          }
          
          console.log('✅ 记录客户端创建成功:', { tableId, recordId, recordClient });
        } catch (error) {
          console.error('❌ 创建记录客户端失败:', error);
          console.log('🔍 SDK 状态检查:', {
            hasAccessToken: !!sdk.config.accessToken,
            shareDBState: sdk.getShareDBConnectionState(),
            realtimeRecordClient: !!sdk.realtimeRecordClient
          });
          throw error;
        }

        // 4. 先注册事件监听器，再开始订阅
        recordClient.on('change', (fieldId: string, newValue: any) => {
          console.log('🔄 收到字段变化 (v2.1):', { fieldId, newValue });
          setRecord(prev => {
            if (!prev) return prev;
            // 创建完全新的对象引用
            return {
              ...prev,
              data: { ...prev.data, [fieldId]: newValue },
              _updateTime: Date.now() // 添加时间戳强制触发更新
            };
          });
        });

        // 5. 监听全局字段变更事件（作为备用方案）
        handleOperation = (event: any) => {
          if (event.tableId === tableId && event.recordId === recordId) {
            console.log('🔄 收到全局字段变更事件 (v2.1):', event);
            
            const { fieldId, newValue } = event;
            if (fieldId && newValue !== undefined) {
              setRecord(prev => {
                if (!prev) return prev;
                return {
                  ...prev,
                  data: { ...prev.data, [fieldId]: newValue },
                  _updateTime: Date.now()
                };
              });
            }
          }
        };

        // 使用 SDK 的 realtime.on 方法监听字段变更事件
        try {
          sdk.realtime.on('field-change', handleOperation);
          console.log('✅ 字段变更事件监听器已注册 (v2.1)');
        } catch (error) {
          console.warn('⚠️ 字段变更事件监听器注册失败:', error);
        }

        // 6. 开始订阅 ShareDB 操作（在事件监听器注册之后）
        recordClient.subscribe();

        setIsSubscribed(true);
        setIsLoading(false);
        console.log('✅ 记录订阅成功 (v2.1):', { tableId, recordId });

        // 轮询检查更新（作为后备方案）- 暂时禁用以避免服务器压力
        // pollInterval = setInterval(async () => {
        //   try {
        //     const freshData = await sdk.getRecord(tableId, recordId);
        //     setRecord(prev => {
        //       // 只在数据真的变化时更新
        //       if (JSON.stringify(prev?.data) !== JSON.stringify(freshData.data)) {
        //         console.log('🔄 轮询检测到数据变化:', freshData.data);
        //         return {
        //           ...freshData,
        //           _updateTime: Date.now()
        //         };
        //       }
        //       return prev;
        //     });
        //   } catch (error) {
        //     console.error('轮询更新失败:', error);
        //   }
        // }, 2000); // 每2秒检查一次
      } catch (error) {
        console.error('订阅记录失败:', error);
        setError(error instanceof Error ? error.message : '订阅失败');
        setIsLoading(false);
      }
    };

    subscribeToRecord();

    return () => {
      // 清理订阅
      if (recordClient) {
        recordClient.unsubscribe();
      }
      if (handleOperation && sdk) {
        try {
          sdk.realtime.off('field-change', handleOperation);
        } catch (error) {
          console.warn('⚠️ 字段变更事件监听器清理失败:', error);
        }
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      setIsSubscribed(false);
    };
  }, [sdk, tableId, recordId]);

  // 更新记录：乐观更新 + HTTP API + ShareDB 广播
  const updateCell = async (fieldId: string, value: any) => {
    if (!sdk || !record || !tableId || !recordId) {
      throw new Error('SDK 或记录未初始化');
    }

    const oldValue = record.data?.[fieldId];

    try {
      // 1. 乐观更新 UI
      setRecord(prev => ({
        ...prev,
        data: { ...prev.data, [fieldId]: value }
      }));

      // 2. HTTP API 持久化（SDK 内部会自动广播到 ShareDB）
      const recordClient = sdk.realtime.record(tableId, recordId);
      await recordClient.set(fieldId, value);

      console.log('字段更新成功:', { fieldId, value });
    } catch (error) {
      console.error('字段更新失败:', error);
      
      // 3. 错误回滚
      setRecord(prev => ({
        ...prev,
        data: { ...prev.data, [fieldId]: oldValue }
      }));
      
      throw error;
    }
  };

  // 刷新记录数据
  const refreshRecord = async () => {
    if (!sdk || !tableId || !recordId) return;

    try {
      setIsLoading(true);
      const freshData = await sdk.getRecord(tableId, recordId);
      setRecord(freshData);
      setIsLoading(false);
    } catch (error) {
      console.error('刷新记录失败:', error);
      setError(error instanceof Error ? error.message : '刷新失败');
      setIsLoading(false);
    }
  };

  return {
    record,
    isSubscribed,
    isLoading,
    error,
    updateCell,
    refreshRecord,
  };
}
