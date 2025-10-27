/**
 * 表单校验器
 */

import type { FieldConfig, FormValues, FormErrors } from './types';

/**
 * 邮箱正则
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * URL 正则
 */
const URL_REGEX = /^https?:\/\/.+/;

/**
 * 电话正则（简单版，支持中国手机号）
 */
const PHONE_REGEX = /^1[3-9]\d{9}$/;

/**
 * 校验单个字段
 */
export function validateField(
  field: FieldConfig,
  value: any,
  locale: { required: string; invalidFormat: string }
): string | null {
  // 必填校验
  if (field.required) {
    if (value === null || value === undefined || value === '') {
      return locale.required;
    }
    // 数组类型（multipleSelect）的必填校验
    if (Array.isArray(value) && value.length === 0) {
      return locale.required;
    }
  }

  // 如果值为空且非必填，跳过类型校验
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // 类型校验
  switch (field.type) {
    case 'number': {
      const num = Number(value);
      if (isNaN(num)) {
        return locale.invalidFormat;
      }
      if (field.options?.min !== undefined && num < field.options.min) {
        return `最小值为 ${field.options.min}`;
      }
      if (field.options?.max !== undefined && num > field.options.max) {
        return `最大值为 ${field.options.max}`;
      }
      break;
    }

    case 'link': {
      if (!URL_REGEX.test(value)) {
        return '请输入有效的链接（以 http:// 或 https:// 开头）';
      }
      break;
    }

    case 'email': {
      if (!EMAIL_REGEX.test(value)) {
        return '请输入有效的邮箱地址';
      }
      break;
    }

    case 'phone': {
      if (!PHONE_REGEX.test(value)) {
        return '请输入有效的手机号码';
      }
      break;
    }

    case 'date': {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return '请输入有效的日期';
      }
      break;
    }

    case 'rating': {
      const rating = Number(value);
      const max = field.options?.max || 5;
      if (isNaN(rating) || rating < 0 || rating > max) {
        return `评分范围: 0-${max}`;
      }
      break;
    }

    case 'singleSelect': {
      const choices = field.options?.choices || [];
      if (choices.length > 0 && !choices.find(c => c.id === value || c.name === value)) {
        return '请选择有效的选项';
      }
      break;
    }

    case 'multipleSelect': {
      if (!Array.isArray(value)) {
        return '请选择至少一个选项';
      }
      const choices = field.options?.choices || [];
      if (choices.length > 0) {
        const validIds = choices.map(c => c.id);
        const invalidValues = value.filter(v => !validIds.includes(v));
        if (invalidValues.length > 0) {
          return '包含无效的选项';
        }
      }
      break;
    }
  }

  return null;
}

/**
 * 校验整个表单
 */
export function validateForm(
  fields: FieldConfig[],
  values: FormValues,
  locale: { required: string; invalidFormat: string }
): FormErrors {
  const errors: FormErrors = {};

  for (const field of fields) {
    // 跳过隐藏字段和锁定字段
    if (field.visible === false || field.locked) {
      continue;
    }

    const value = values[field.id];
    const error = validateField(field, value, locale);
    
    if (error) {
      errors[field.id] = error;
    }
  }

  return errors;
}

/**
 * 判断表单是否有错误
 */
export function hasErrors(errors: FormErrors): boolean {
  return Object.keys(errors).length > 0;
}

