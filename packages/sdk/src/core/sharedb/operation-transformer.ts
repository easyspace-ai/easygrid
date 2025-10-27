/**
 * ShareDB 操作转换器
 * 实现 OT 算法、冲突检测和版本控制
 */

import type { OTOperation, ShareDBSnapshot } from '../../types/sharedb.js';

export interface TransformResult {
  operations: OTOperation[];
  version: number;
  conflicts: OperationConflict[];
}

export interface OperationConflict {
  type: 'version' | 'path' | 'value';
  message: string;
  operation: OTOperation;
  conflictingOperation?: OTOperation;
}

export class OperationTransformer {
  /**
   * 转换操作以解决冲突
   */
  static transform(
    operation: OTOperation,
    against: OTOperation[],
    document: any
  ): TransformResult {
    let transformedOp = operation;
    const conflicts: OperationConflict[] = [];
    let version = 0;

    for (const againstOp of against) {
      const result = this.transformOperation(transformedOp, againstOp, document);
      transformedOp = result.operation;
      conflicts.push(...result.conflicts);
      version = Math.max(version, result.version);
    }

    return {
      operations: [transformedOp],
      version,
      conflicts
    };
  }

  /**
   * 转换单个操作
   */
  private static transformOperation(
    op1: OTOperation,
    op2: OTOperation,
    document: any
  ): { operation: OTOperation; conflicts: OperationConflict[]; version: number } {
    const conflicts: OperationConflict[] = [];
    let transformedOp = { ...op1 };

    // 检查路径冲突
    if (this.hasPathConflict(op1.p, op2.p)) {
      const conflict = this.resolvePathConflict(op1, op2, document);
      transformedOp = conflict.operation;
      conflicts.push(...conflict.conflicts);
    }

    // 检查值冲突
    if (this.hasValueConflict(op1, op2)) {
      const conflict = this.resolveValueConflict(op1, op2, document);
      transformedOp = conflict.operation;
      conflicts.push(...conflict.conflicts);
    }

    return {
      operation: transformedOp,
      conflicts,
      version: 1
    };
  }

  /**
   * 检查路径冲突
   */
  private static hasPathConflict(path1: (string | number)[], path2: (string | number)[]): boolean {
    // 如果路径完全相同，有冲突
    if (this.pathsEqual(path1, path2)) {
      return true;
    }

    // 如果一个路径是另一个的前缀，有冲突
    return this.isPrefix(path1, path2) || this.isPrefix(path2, path1);
  }

  /**
   * 检查值冲突
   */
  private static hasValueConflict(op1: OTOperation, op2: OTOperation): boolean {
    // 如果两个操作都修改同一个值，有冲突
    if (this.pathsEqual(op1.p, op2.p)) {
      return true;
    }

    return false;
  }

  /**
   * 解决路径冲突
   */
  private static resolvePathConflict(
    op1: OTOperation,
    op2: OTOperation,
    document: any
  ): { operation: OTOperation; conflicts: OperationConflict[] } {
    const conflicts: OperationConflict[] = [];
    let operation = { ...op1 };

    // 如果路径完全相同，需要特殊处理
    if (this.pathsEqual(op1.p, op2.p)) {
      // 根据操作类型决定如何解决
      if (op1.oi !== undefined && op2.oi !== undefined) {
        // 两个都是插入操作，保留后一个
        operation = op2;
        conflicts.push({
          type: 'value',
          message: 'Both operations insert values at the same path',
          operation: op1,
          conflictingOperation: op2
        });
      } else if (op1.od !== undefined && op2.od !== undefined) {
        // 两个都是删除操作，保留第一个
        conflicts.push({
          type: 'value',
          message: 'Both operations delete values at the same path',
          operation: op1,
          conflictingOperation: op2
        });
      } else if (op1.oi !== undefined && op2.od !== undefined) {
        // 插入 vs 删除，删除优先
        operation = op2;
        conflicts.push({
          type: 'value',
          message: 'Insert operation conflicts with delete operation',
          operation: op1,
          conflictingOperation: op2
        });
      }
    } else if (this.isPrefix(op2.p, op1.p)) {
      // op2 的路径是 op1 的前缀，需要调整 op1 的路径
      const adjustedPath = this.adjustPathForPrefix(op1.p, op2.p);
      operation = { ...op1, p: adjustedPath };
    }

    return { operation, conflicts };
  }

  /**
   * 解决值冲突
   */
  private static resolveValueConflict(
    op1: OTOperation,
    op2: OTOperation,
    document: any
  ): { operation: OTOperation; conflicts: OperationConflict[] } {
    const conflicts: OperationConflict[] = [];
    let operation = { ...op1 };

    // 简单的冲突解决策略：保留后一个操作
    operation = op2;
    conflicts.push({
      type: 'value',
      message: 'Value conflict resolved by keeping later operation',
      operation: op1,
      conflictingOperation: op2
    });

    return { operation, conflicts };
  }

  /**
   * 检查两个路径是否相等
   */
  private static pathsEqual(path1: (string | number)[], path2: (string | number)[]): boolean {
    if (path1.length !== path2.length) {
      return false;
    }
    return path1.every((segment, index) => segment === path2[index]);
  }

  /**
   * 检查 path1 是否是 path2 的前缀
   */
  private static isPrefix(path1: (string | number)[], path2: (string | number)[]): boolean {
    if (path1.length >= path2.length) {
      return false;
    }
    return path1.every((segment, index) => segment === path2[index]);
  }

  /**
   * 调整路径以适应前缀冲突
   */
  private static adjustPathForPrefix(path: (string | number)[], prefix: (string | number)[]): (string | number)[] {
    // 简单的调整策略：在路径末尾添加索引
    return [...path, 0];
  }

  /**
   * 应用操作到文档
   */
  static applyOperation(document: any, operation: OTOperation): any {
    const result = JSON.parse(JSON.stringify(document));
    this.applyOperationToObject(result, operation);
    return result;
  }

  /**
   * 将操作应用到对象
   */
  private static applyOperationToObject(obj: any, operation: OTOperation): void {
    const path = operation.p;
    const target = this.getNestedObject(obj, path.slice(0, -1));
    const key = path[path.length - 1];

    if (operation.oi !== undefined) {
      // 插入操作
      if (Array.isArray(target)) {
        target.splice(Number(key), 0, operation.oi);
      } else {
        target[key] = operation.oi;
      }
    } else if (operation.od !== undefined) {
      // 删除操作
      if (Array.isArray(target)) {
        target.splice(Number(key), 1);
      } else {
        delete target[key];
      }
    } else if (operation.li !== undefined) {
      // 列表插入
      if (Array.isArray(target)) {
        target.splice(Number(key), 0, operation.li);
      }
    } else if (operation.ld !== undefined) {
      // 列表删除
      if (Array.isArray(target)) {
        target.splice(Number(key), 1);
      }
    } else if (operation.lm !== undefined) {
      // 列表移动
      if (Array.isArray(target)) {
        const item = target.splice(Number(key), 1)[0];
        target.splice(operation.lm, 0, item);
      }
    } else if (operation.na !== undefined) {
      // 数字加法
      if (typeof target[key] === 'number') {
        target[key] += operation.na;
      }
    }
  }

  /**
   * 获取嵌套对象
   */
  private static getNestedObject(obj: any, path: (string | number)[]): any {
    let current = obj;
    for (const segment of path) {
      if (current[segment] === undefined) {
        current[segment] = {};
      }
      current = current[segment];
    }
    return current;
  }

  /**
   * 检查操作是否有效
   */
  static validateOperation(operation: OTOperation, document: any): boolean {
    try {
      // 尝试应用操作
      this.applyOperation(document, operation);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 合并多个操作
   */
  static mergeOperations(operations: OTOperation[]): OTOperation[] {
    if (operations.length <= 1) {
      return operations;
    }

    // 简单的合并策略：按路径分组，保留最后一个操作
    const pathMap = new Map<string, OTOperation>();
    
    for (const op of operations) {
      const pathKey = op.p.join('.');
      pathMap.set(pathKey, op);
    }

    return Array.from(pathMap.values());
  }

  /**
   * 反转操作
   */
  static invertOperation(operation: OTOperation, document: any): OTOperation {
    const inverted = { ...operation };

    if (operation.oi !== undefined) {
      // 插入变删除
      inverted.od = operation.oi;
      delete inverted.oi;
    } else if (operation.od !== undefined) {
      // 删除变插入
      inverted.oi = operation.od;
      delete inverted.od;
    } else if (operation.li !== undefined) {
      // 列表插入变删除
      inverted.ld = operation.li;
      delete inverted.li;
    } else if (operation.ld !== undefined) {
      // 列表删除变插入
      inverted.li = operation.ld;
      delete inverted.ld;
    } else if (operation.na !== undefined) {
      // 数字加法变减法
      inverted.na = -operation.na;
    }

    return inverted;
  }
}
