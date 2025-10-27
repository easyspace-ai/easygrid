/**
 * History Context
 * 操作历史Context
 */

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { OperationHistory, type IHistoryEntry } from '../../lib/operation-history';

export interface IHistoryContext {
  operations: IHistoryEntry[];
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  pushOperation: (entry: Omit<IHistoryEntry, 'id' | 'timestamp'>) => void;
  clear: () => void;
  getRecordHistory: (recordId: string) => IHistoryEntry[];
  getFieldHistory: (recordId: string, fieldId: string) => IHistoryEntry[];
}

const HistoryContext = createContext<IHistoryContext | undefined>(undefined);

export interface IHistoryProviderProps {
  children: ReactNode;
  maxSize?: number;
  autoSave?: boolean;
  storageKey?: string;
}

export function HistoryProvider({
  children,
  maxSize = 100,
  autoSave = true,
  storageKey = 'grid_operation_history',
}: IHistoryProviderProps) {
  const [historyManager] = useState(() => new OperationHistory({
    maxSize,
    autoSave,
    storageKey,
  }));

  const [operations, setOperations] = useState<IHistoryEntry[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 监听历史变化
  useEffect(() => {
    const unsubscribe = historyManager.onChange((history) => {
      setOperations(history);
      setCanUndo(historyManager.canUndo());
      setCanRedo(historyManager.canRedo());
    });

    // 初始状态
    setOperations(historyManager.getHistory());
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());

    return unsubscribe;
  }, [historyManager]);

  const undo = useCallback(async () => {
    const entry = historyManager.undo();
    if (entry) {
      // TODO: 执行实际的撤销操作
    }
  }, [historyManager]);

  const redo = useCallback(async () => {
    const entry = historyManager.redo();
    if (entry) {
      // TODO: 执行实际的重做操作
    }
  }, [historyManager]);

  const pushOperation = useCallback((entry: Omit<IHistoryEntry, 'id' | 'timestamp'>) => {
    historyManager.push(entry);
  }, [historyManager]);

  const clear = useCallback(() => {
    historyManager.clear();
  }, [historyManager]);

  const getRecordHistory = useCallback((recordId: string) => {
    return historyManager.getRecordHistory(recordId);
  }, [historyManager]);

  const getFieldHistory = useCallback((recordId: string, fieldId: string) => {
    return historyManager.getFieldHistory(recordId, fieldId);
  }, [historyManager]);

  const value: IHistoryContext = {
    operations,
    undo,
    redo,
    canUndo,
    canRedo,
    pushOperation,
    clear,
    getRecordHistory,
    getFieldHistory,
  };

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory(): IHistoryContext {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within HistoryProvider');
  }
  return context;
}

