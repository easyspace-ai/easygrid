/**
 * ShareDB 操作构建器
 * 提供便捷的方法来构建各种类型的操作
 */

import type { OTOperation } from '../types/index.js';

/**
 * 操作构建器类
 * 提供静态方法来构建不同类型的 ShareDB 操作
 */
export class OperationBuilder {
  /**
   * 设置记录字段值
   */
  static setRecordField(fieldName: string, value: any): OTOperation {
    return {
      p: ['fields', fieldName],
      oi: value
    };
  }

  /**
   * 删除记录字段
   */
  static deleteRecordField(fieldName: string): OTOperation {
    return {
      p: ['fields', fieldName],
      od: true
    };
  }

  /**
   * 设置嵌套属性
   */
  static setNestedProperty(path: (string | number)[], value: any): OTOperation {
    return {
      p: path,
      oi: value
    };
  }

  /**
   * 删除嵌套属性
   */
  static deleteNestedProperty(path: (string | number)[]): OTOperation {
    return {
      p: path,
      od: true
    };
  }

  /**
   * 插入数组元素
   */
  static insertArrayElement(arrayPath: (string | number)[], index: number, value: any): OTOperation {
    return {
      p: [...arrayPath, index],
      li: value
    };
  }

  /**
   * 删除数组元素
   */
  static deleteArrayElement(arrayPath: (string | number)[], index: number): OTOperation {
    return {
      p: [...arrayPath, index],
      ld: true
    };
  }

  /**
   * 条件操作
   */
  static conditional(condition: boolean, trueOp: OTOperation, falseOp: OTOperation): OTOperation {
    return condition ? trueOp : falseOp;
  }

  /**
   * 组合多个操作
   */
  static combine(...operations: OTOperation[]): OTOperation[] {
    return operations;
  }

  /**
   * 设置对象属性
   */
  static setObjectProperty(objectPath: (string | number)[], property: string, value: any): OTOperation {
    return {
      p: [...objectPath, property],
      oi: value
    };
  }

  /**
   * 删除对象属性
   */
  static deleteObjectProperty(objectPath: (string | number)[], property: string): OTOperation {
    return {
      p: [...objectPath, property],
      od: true
    };
  }

  /**
   * 设置数组元素
   */
  static setArrayElement(arrayPath: (string | number)[], index: number, value: any): OTOperation {
    return {
      p: [...arrayPath, index],
      oi: value
    };
  }

  /**
   * 删除数组元素
   */
  static deleteArrayElementByIndex(arrayPath: (string | number)[], index: number): OTOperation {
    return {
      p: [...arrayPath, index],
      ld: true
    };
  }

  /**
   * 设置根属性
   */
  static setRootProperty(property: string, value: any): OTOperation {
    return {
      p: [property],
      oi: value
    };
  }

  /**
   * 删除根属性
   */
  static deleteRootProperty(property: string): OTOperation {
    return {
      p: [property],
      od: true
    };
  }

  /**
   * 设置元数据
   */
  static setMetadata(metadata: Record<string, any>): OTOperation {
    return {
      p: ['metadata'],
      oi: metadata
    };
  }

  /**
   * 更新元数据属性
   */
  static updateMetadataProperty(key: string, value: any): OTOperation {
    return {
      p: ['metadata', key],
      oi: value
    };
  }

  /**
   * 删除元数据属性
   */
  static deleteMetadataProperty(key: string): OTOperation {
    return {
      p: ['metadata', key],
      od: true
    };
  }

  /**
   * 设置时间戳
   */
  static setTimestamp(timestamp: string | number): OTOperation {
    return {
      p: ['timestamp'],
      oi: timestamp
    };
  }

  /**
   * 设置版本
   */
  static setVersion(version: number): OTOperation {
    return {
      p: ['version'],
      oi: version
    };
  }

  /**
   * 设置状态
   */
  static setStatus(status: string): OTOperation {
    return {
      p: ['status'],
      oi: status
    };
  }

  /**
   * 设置标签
   */
  static setTags(tags: string[]): OTOperation {
    return {
      p: ['tags'],
      oi: tags
    };
  }

  /**
   * 添加标签
   */
  static addTag(tag: string): OTOperation {
    return {
      p: ['tags', -1], // -1 表示添加到末尾
      li: tag
    };
  }

  /**
   * 删除标签
   */
  static removeTag(tag: string): OTOperation {
    return {
      p: ['tags'],
      od: tag
    };
  }

  /**
   * 设置配置
   */
  static setConfig(config: Record<string, any>): OTOperation {
    return {
      p: ['config'],
      oi: config
    };
  }

  /**
   * 更新配置属性
   */
  static updateConfigProperty(key: string, value: any): OTOperation {
    return {
      p: ['config', key],
      oi: value
    };
  }

  /**
   * 删除配置属性
   */
  static deleteConfigProperty(key: string): OTOperation {
    return {
      p: ['config', key],
      od: true
    };
  }

  /**
   * 设置权限
   */
  static setPermissions(permissions: Record<string, any>): OTOperation {
    return {
      p: ['permissions'],
      oi: permissions
    };
  }

  /**
   * 更新权限
   */
  static updatePermission(userId: string, permission: string): OTOperation {
    return {
      p: ['permissions', userId],
      oi: permission
    };
  }

  /**
   * 删除权限
   */
  static deletePermission(userId: string): OTOperation {
    return {
      p: ['permissions', userId],
      od: true
    };
  }
}