/**
 * ShareDB 操作构建器
 * 生成 JSON0 格式的 OT 操作
 */

import type { OTOperation, OperationBuilderConfig } from '../../types/sharedb.js';

export class OperationBuilder {
  private config: OperationBuilderConfig;
  private pendingOperations: OTOperation[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(config: OperationBuilderConfig = {}) {
    this.config = {
      enableCompression: true,
      enableBatching: true,
      batchSize: 10,
      batchTimeout: 100,
      ...config
    };
  }

  /**
   * 替换字段值
   */
  static replaceField(path: (string | number)[], oldValue: any, newValue: any): OTOperation {
    return {
      p: path,
      od: oldValue,
      oi: newValue
    };
  }

  /**
   * 插入字段
   */
  static insertField(path: (string | number)[], value: any): OTOperation {
    return {
      p: path,
      oi: value
    };
  }

  /**
   * 删除字段
   */
  static deleteField(path: (string | number)[], oldValue: any): OTOperation {
    return {
      p: path,
      od: oldValue
    };
  }

  /**
   * 插入数组项
   */
  static insertArrayItem(path: (string | number)[], index: number, value: any): OTOperation {
    return {
      p: [...path, index],
      li: value
    };
  }

  /**
   * 删除数组项
   */
  static deleteArrayItem(path: (string | number)[], index: number, oldValue: any): OTOperation {
    return {
      p: [...path, index],
      ld: oldValue
    };
  }

  /**
   * 移动数组项
   */
  static moveArrayItem(path: (string | number)[], from: number, to: number): OTOperation {
    return {
      p: [...path, from],
      lm: to
    };
  }

  /**
   * 数字加法
   */
  static addNumber(path: (string | number)[], value: number): OTOperation {
    return {
      p: path,
      na: value
    };
  }

  /**
   * 批量操作构建器
   */
  batch(): OperationBatchBuilder {
    return new OperationBatchBuilder(this.config);
  }

  /**
   * 压缩操作
   */
  compress(operations: OTOperation[]): OTOperation[] {
    if (!this.config.enableCompression || operations.length <= 1) {
      return operations;
    }

    const compressed: OTOperation[] = [];
    const pathMap = new Map<string, OTOperation[]>();

    // 按路径分组操作
    for (const op of operations) {
      const pathKey = op.p.join('.');
      if (!pathMap.has(pathKey)) {
        pathMap.set(pathKey, []);
      }
      pathMap.get(pathKey)!.push(op);
    }

    // 合并同路径的操作
    for (const [pathKey, ops] of pathMap) {
      if (ops.length === 1) {
        compressed.push(ops[0]);
      } else {
        // 合并多个操作
        const merged = this.mergeOperations(ops);
        compressed.push(...merged);
      }
    }

    return compressed;
  }

  /**
   * 合并同路径的操作
   */
  private mergeOperations(operations: OTOperation[]): OTOperation[] {
    if (operations.length === 0) {
      return [];
    }

    if (operations.length === 1) {
      return operations;
    }

    // 简单的合并策略：保留最后一个有效操作
    const lastOp = operations[operations.length - 1];
    const merged: OTOperation[] = [];

    // 检查是否有冲突的操作
    const hasConflict = this.hasConflictingOperations(operations);
    if (hasConflict) {
      // 如果有冲突，保留所有操作
      return operations;
    }

    // 合并操作
    const mergedOp: OTOperation = { ...lastOp };
    
    // 合并插入和删除操作
    for (const op of operations) {
      if (op.oi !== undefined) {
        mergedOp.oi = op.oi;
      }
      if (op.od !== undefined) {
        mergedOp.od = op.od;
      }
      if (op.li !== undefined) {
        mergedOp.li = op.li;
      }
      if (op.ld !== undefined) {
        mergedOp.ld = op.ld;
      }
      if (op.lm !== undefined) {
        mergedOp.lm = op.lm;
      }
      if (op.na !== undefined) {
        mergedOp.na = (mergedOp.na || 0) + op.na;
      }
    }

    merged.push(mergedOp);
    return merged;
  }

  /**
   * 检查是否有冲突的操作
   */
  private hasConflictingOperations(operations: OTOperation[]): boolean {
    const hasInsert = operations.some(op => op.oi !== undefined || op.li !== undefined);
    const hasDelete = operations.some(op => op.od !== undefined || op.ld !== undefined);
    const hasMove = operations.some(op => op.lm !== undefined);
    const hasNumberAdd = operations.some(op => op.na !== undefined);

    // 如果有多种类型的操作，认为有冲突
    const operationTypes = [hasInsert, hasDelete, hasMove, hasNumberAdd].filter(Boolean).length;
    return operationTypes > 1;
  }

  /**
   * 验证操作
   */
  static validateOperation(operation: OTOperation): boolean {
    if (!operation || typeof operation !== 'object') {
      return false;
    }

    if (!Array.isArray(operation.p)) {
      return false;
    }

    // 至少需要有一个操作类型
    const hasOperation = 'oi' in operation || 'od' in operation || 
                        'li' in operation || 'ld' in operation || 
                        'lm' in operation || 'na' in operation;
    
    return hasOperation;
  }

  /**
   * 创建字段路径
   */
  static createFieldPath(fieldId: string): (string | number)[] {
    return ['fields', fieldId];
  }

  /**
   * 创建数组项路径
   */
  static createArrayItemPath(fieldId: string, index: number): (string | number)[] {
    return ['fields', fieldId, index];
  }

  /**
   * 创建嵌套字段路径
   */
  static createNestedFieldPath(fieldId: string, nestedPath: (string | number)[]): (string | number)[] {
    return ['fields', fieldId, ...nestedPath];
  }
}

/**
 * 批量操作构建器
 */
export class OperationBatchBuilder {
  private operations: OTOperation[] = [];
  private config: OperationBuilderConfig;

  constructor(config: OperationBuilderConfig) {
    this.config = config;
  }

  /**
   * 添加操作
   */
  add(operation: OTOperation): this {
    this.operations.push(operation);
    return this;
  }

  /**
   * 替换字段
   */
  replaceField(fieldId: string, oldValue: any, newValue: any): this {
    return this.add(OperationBuilder.replaceField(
      OperationBuilder.createFieldPath(fieldId),
      oldValue,
      newValue
    ));
  }

  /**
   * 插入字段
   */
  insertField(fieldId: string, value: any): this {
    return this.add(OperationBuilder.insertField(
      OperationBuilder.createFieldPath(fieldId),
      value
    ));
  }

  /**
   * 删除字段
   */
  deleteField(fieldId: string, oldValue: any): this {
    return this.add(OperationBuilder.deleteField(
      OperationBuilder.createFieldPath(fieldId),
      oldValue
    ));
  }

  /**
   * 构建操作数组
   */
  build(): OTOperation[] {
    if (this.config.enableCompression) {
      const builder = new OperationBuilder(this.config);
      return builder.compress(this.operations);
    }
    return [...this.operations];
  }

  /**
   * 清空操作
   */
  clear(): this {
    this.operations = [];
    return this;
  }

  /**
   * 获取操作数量
   */
  get length(): number {
    return this.operations.length;
  }
}
