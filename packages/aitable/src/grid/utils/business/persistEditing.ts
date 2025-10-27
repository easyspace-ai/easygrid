/**
 * Field types that need persistent editing
 */
export enum FieldType {
  SingleLineText = 'singleLineText',
  LongText = 'longText',
  Number = 'number',
  SingleSelect = 'singleSelect',
  MultipleSelect = 'multipleSelect',
  Date = 'date',
  Checkbox = 'checkbox',
  User = 'user',
  Attachment = 'attachment',
  Link = 'link',
  Rating = 'rating',
  Formula = 'formula',
  Rollup = 'rollup',
  Count = 'count',
  CreatedTime = 'createdTime',
  LastModifiedTime = 'lastModifiedTime',
  CreatedBy = 'createdBy',
  LastModifiedBy = 'lastModifiedBy',
  AutoNumber = 'autoNumber',
}

/**
 * Field types that need to persist editing state
 */
export const NEED_PERSIST_EDITING_FIELD_TYPES = new Set([
  FieldType.LongText,
  FieldType.SingleLineText,
  FieldType.Number,
]);

/**
 * Field instance interface
 */
export interface IFieldInstance {
  id: string;
  type: FieldType;
  name: string;
  [key: string]: unknown;
}

/**
 * Check if field needs persist editing
 */
export const isNeedPersistEditing = (
  fields: IFieldInstance[],
  fieldId: string
): boolean => {
  const field = fields.find((f) => f.id === fieldId);
  
  if (!field) {
    return false;
  }

  return NEED_PERSIST_EDITING_FIELD_TYPES.has(field.type);
};

/**
 * Editing state interface
 */
export interface IEditingState {
  fieldId: string;
  recordId: string;
  value: unknown;
  timestamp: number;
}

/**
 * Local storage key for editing state
 */
const EDITING_STATE_KEY = 'grid-editing-state';

/**
 * Save editing state to local storage
 */
export const saveEditingState = (state: IEditingState): void => {
  try {
    const states = getEditingStates();
    const key = `${state.recordId}-${state.fieldId}`;
    states[key] = state;
    
    localStorage.setItem(EDITING_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to save editing state:', error);
  }
};

/**
 * Get all editing states from local storage
 */
export const getEditingStates = (): Record<string, IEditingState> => {
  try {
    const data = localStorage.getItem(EDITING_STATE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to get editing states:', error);
    return {};
  }
};

/**
 * Get editing state for specific record and field
 */
export const getEditingState = (
  recordId: string,
  fieldId: string
): IEditingState | null => {
  const states = getEditingStates();
  const key = `${recordId}-${fieldId}`;
  return states[key] || null;
};

/**
 * Clear editing state
 */
export const clearEditingState = (recordId: string, fieldId: string): void => {
  try {
    const states = getEditingStates();
    const key = `${recordId}-${fieldId}`;
    delete states[key];
    
    localStorage.setItem(EDITING_STATE_KEY, JSON.stringify(states));
  } catch (error) {
    console.error('Failed to clear editing state:', error);
  }
};

/**
 * Clear all editing states
 */
export const clearAllEditingStates = (): void => {
  try {
    localStorage.removeItem(EDITING_STATE_KEY);
  } catch (error) {
    console.error('Failed to clear all editing states:', error);
  }
};

/**
 * Clear expired editing states (older than 24 hours)
 */
export const clearExpiredEditingStates = (): void => {
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours
  const now = Date.now();
  
  try {
    const states = getEditingStates();
    const validStates: Record<string, IEditingState> = {};
    
    Object.entries(states).forEach(([key, state]) => {
      if (now - state.timestamp < MAX_AGE) {
        validStates[key] = state;
      }
    });
    
    localStorage.setItem(EDITING_STATE_KEY, JSON.stringify(validStates));
  } catch (error) {
    console.error('Failed to clear expired editing states:', error);
  }
};

