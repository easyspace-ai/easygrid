/**
 * 类型守卫工具集
 * 
 * 用于在运行时安全地检查类型，消灭 any 类型
 * 这是 TypeScript 严格模式的核心基础设施
 */

// 基础类型守卫
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// 联合类型守卫
export function isStringOrNumber(value: unknown): value is string | number {
  return isString(value) || isNumber(value);
}

export function isPrimitive(value: unknown): value is string | number | boolean | null | undefined {
  return isString(value) || isNumber(value) || isBoolean(value) || isNullish(value);
}

// 对象属性守卫
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every(key => key in obj);
}

// 数组类型守卫
export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

export function isObjectArray(value: unknown): value is Record<string, unknown>[] {
  return isArray(value) && value.every(isObject);
}

// Grid 特定类型守卫
export function isCellValue(value: unknown): value is string | number | boolean | Date | null {
  return isPrimitive(value) || isDate(value);
}

export function isFieldType(value: unknown): value is string {
  return isString(value) && [
    'singleLineText',
    'multilineText', 
    'number',
    'date',
    'singleSelect',
    'multiSelect',
    'checkbox',
    'attachment',
    'formula',
    'lookup',
    'rollup',
    'user'
  ].includes(value);
}

export function isViewType(value: unknown): value is string {
  return isString(value) && ['grid', 'kanban', 'calendar', 'gallery'].includes(value);
}

// 深度类型检查
export function isRecordWithFields(
  value: unknown,
  requiredFields: string[]
): value is Record<string, unknown> {
  return isObject(value) && requiredFields.every(field => field in value);
}

// 类型转换助手（安全）
export function safeString(value: unknown, defaultValue = ''): string {
  return isString(value) ? value : defaultValue;
}

export function safeNumber(value: unknown, defaultValue = 0): number {
  return isNumber(value) ? value : defaultValue;
}

export function safeBoolean(value: unknown, defaultValue = false): boolean {
  return isBoolean(value) ? value : defaultValue;
}

export function safeArray<T>(value: unknown, defaultValue: T[] = []): T[] {
  return isArray(value) ? value as T[] : defaultValue;
}

export function safeObject<T extends Record<string, unknown>>(
  value: unknown,
  defaultValue: T
): T {
  return isObject(value) ? value as T : defaultValue;
}

// 断言工具（开发环境）
export function assertIsString(value: unknown, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || `Expected string, got ${typeof value}`);
  }
}

export function assertIsNumber(value: unknown, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || `Expected number, got ${typeof value}`);
  }
}

export function assertIsObject(value: unknown, message?: string): asserts value is Record<string, unknown> {
  if (!isObject(value)) {
    throw new Error(message || `Expected object, got ${typeof value}`);
  }
}

export function assertIsArray(value: unknown, message?: string): asserts value is unknown[] {
  if (!isArray(value)) {
    throw new Error(message || `Expected array, got ${typeof value}`);
  }
}

// 运行时验证（结合 Zod 使用）
export function validateFieldType(value: unknown): string {
  if (!isFieldType(value)) {
    throw new Error(`Invalid field type: ${value}`);
  }
  return value;
}

export function validateViewType(value: unknown): string {
  if (!isViewType(value)) {
    throw new Error(`Invalid view type: ${value}`);
  }
  return value;
}

// 类型安全的 JSON 解析
export function safeJsonParse<T = unknown>(json: string, defaultValue: T): T {
  try {
    const parsed = JSON.parse(json);
    return parsed as T;
  } catch {
    return defaultValue;
  }
}

// 类型安全的深度合并
export function safeMerge<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>
): T {
  const result = { ...target } as any;
  
  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(result[key])) {
      result[key] = safeMerge(result[key] as Record<string, unknown>, value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// 类型安全的数组操作
export function safeArrayMap<T, U>(
  array: unknown,
  mapper: (item: T, index: number) => U
): U[] {
  if (!isArray(array)) {
    return [];
  }
  
  return array.map((item, index) => mapper(item as T, index));
}

export function safeArrayFilter<T>(
  array: unknown,
  predicate: (item: T, index: number) => boolean
): T[] {
  if (!isArray(array)) {
    return [];
  }
  
  return array.filter((item, index) => predicate(item as T, index)) as any;
}

export function safeArrayFind<T>(
  array: unknown,
  predicate: (item: T, index: number) => boolean
): T | undefined {
  if (!isArray(array)) {
    return undefined;
  }
  
  return array.find((item, index) => predicate(item as T, index)) as T | undefined;
}

// 类型安全的对象操作
export function safeObjectKeys(obj: unknown): string[] {
  return isObject(obj) ? Object.keys(obj) : [];
}

export function safeObjectValues<T>(obj: unknown): T[] {
  return isObject(obj) ? Object.values(obj) as T[] : [];
}

export function safeObjectEntries<T>(obj: unknown): [string, T][] {
  return isObject(obj) ? Object.entries(obj) as [string, T][] : [];
}