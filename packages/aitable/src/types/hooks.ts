/**
 * Hook types - simplified from SDK hooks
 */

export type IButtonClickStatusHook = {
  checkLoading?: (fieldId: string, recordId: string) => boolean;
  buttonClick: (args: { tableId: string; recordId: string; fieldId: string; name?: string }) => void;
};