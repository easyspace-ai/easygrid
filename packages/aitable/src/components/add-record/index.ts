/**
 * AddRecordDialog Module
 * 添加记录弹窗模块
 */

export { AddRecordDialog } from './AddRecordDialog';
export type {
  AddRecordDialogProps,
  FieldConfig,
  FormValues,
  FormErrors,
  FieldEditorProps,
  ValidationRule,
  ValidatorMap,
} from './types';
export { validateForm, validateField, hasErrors } from './validators';
export {
  getFieldEditor,
  isFieldEditable,
  TextEditor,
  LongTextEditor,
  NumberEditor,
  BooleanEditor,
  DateEditor,
  SelectEditor,
  MultiSelectEditor,
  RatingEditor,
  LinkEditor,
  EmailEditor,
  PhoneEditor,
} from './field-editors';

