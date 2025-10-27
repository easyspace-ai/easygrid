/**
 * 字段编辑器注册中心
 * 根据字段类型返回对应的编辑器组件
 */

import React from 'react';
import type { FieldEditorProps } from '../types';
import { TextEditor } from './TextEditor';
import { NumberEditor } from './NumberEditor';
import { BooleanEditor } from './BooleanEditor';
import { DateEditor } from './DateEditor';
import { SelectEditor } from './SelectEditor';
import { MultiSelectEditor } from './MultiSelectEditor';
import { RatingEditor } from './RatingEditor';
import { LinkEditor } from './LinkEditor';
import { EmailEditor } from './EmailEditor';
import { PhoneEditor } from './PhoneEditor';
import { LongTextEditor } from './LongTextEditor';

/**
 * 字段编辑器映射表
 */
const EDITOR_MAP: Record<string, React.ComponentType<FieldEditorProps>> = {
  // 文本类
  text: TextEditor,
  singleLineText: TextEditor,
  longText: LongTextEditor,
  
  // 数字类
  number: NumberEditor,
  
  // 布尔类
  boolean: BooleanEditor,
  checkbox: BooleanEditor,
  
  // 日期类
  date: DateEditor,
  dateTime: DateEditor,
  
  // 选择类
  singleSelect: SelectEditor,
  multipleSelect: MultiSelectEditor,
  multiSelect: MultiSelectEditor,
  
  // 特殊类
  rating: RatingEditor,
  link: LinkEditor,
  url: LinkEditor,
  email: EmailEditor,
  phone: PhoneEditor,
  
  // 关联类（暂不支持编辑）
  user: TextEditor, // 临时用文本编辑器
  attachment: TextEditor, // 临时用文本编辑器
  
  // 计算类（只读，不需要编辑器）
  formula: () => null,
  rollup: () => null,
  count: () => null,
  createdTime: () => null,
  lastModifiedTime: () => null,
  createdBy: () => null,
  lastModifiedBy: () => null,
  autoNumber: () => null,
  button: () => null,
};

/**
 * 获取字段编辑器
 */
export function getFieldEditor(
  fieldType: string
): React.ComponentType<FieldEditorProps> {
  const Editor = EDITOR_MAP[fieldType];
  
  if (!Editor) {
    console.warn(`No editor found for field type: ${fieldType}, using TextEditor as fallback`);
    return TextEditor;
  }
  
  return Editor;
}

/**
 * 判断字段是否可编辑
 */
export function isFieldEditable(fieldType: string): boolean {
  const computedTypes = [
    'formula',
    'rollup',
    'count',
    'createdTime',
    'lastModifiedTime',
    'createdBy',
    'lastModifiedBy',
    'autoNumber',
    'button',
  ];
  
  return !computedTypes.includes(fieldType);
}

