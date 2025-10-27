import { format } from 'date-fns';

/**
 * Date formatting options
 */
export interface IDatetimeFormatting {
  date: string;
  time: string;
  timeZone?: string;
}

/**
 * Format date to string based on formatting options
 */
export const formatDateToString = (
  dateValue: string | Date,
  formatting: Omit<IDatetimeFormatting, 'timeZone'>
): string => {
  if (!dateValue) {return '';}
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  const { date: dateFormat, time: timeFormat } = formatting;
  
  try {
    const formatString = timeFormat ? `${dateFormat} ${timeFormat}` : dateFormat;
    return format(date, formatString);
  } catch (error) {
    console.error('Error formatting date:', error);
    return String(dateValue);
  }
};

/**
 * Convert cell date value to string
 */
export const cellDate2String = (
  cellValue: unknown,
  formatting: IDatetimeFormatting,
  isMultipleCellValue?: boolean
): string => {
  if (cellValue == null) {return '';}
  
  if (isMultipleCellValue && Array.isArray(cellValue)) {
    return cellValue
      .map((v) => {
        const { timeZone, ...formattingWithoutTz } = formatting;
        return formatDateToString(v as string, formattingWithoutTz);
      })
      .join(', ');
  }

  const { timeZone, ...formattingWithoutTz } = formatting;
  return formatDateToString(cellValue as string, formattingWithoutTz);
};

/**
 * Get group display value for different field types
 */
export const getGroupDisplayValue = (value: unknown, fieldType?: string): string => {
  if (value == null || value === '') {
    return '(Empty)';
  }

  if (Array.isArray(value)) {
    return value.map(v => String(v)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
};

/**
 * Sort group values
 */
export const sortGroupValues = (a: unknown, b: unknown): number => {
  if (a == null && b == null) {return 0;}
  if (a == null) {return 1;}
  if (b == null) {return -1;}

  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  return String(a).localeCompare(String(b));
};

