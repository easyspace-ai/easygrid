/**
 * Common editor props
 */
export interface IBaseEditorProps<T = unknown> {
  value: T;
  onChange: (value: T) => void;
  onSave?: () => void;
  onCancel?: () => void;
  readonly?: boolean;
  className?: string;
  style?: React.CSSProperties;
  rect?: IEditorRect;
}

/**
 * Editor rect position
 */
export interface IEditorRect {
  x: number;
  y: number;
  width: number;
  height: number;
  editorId: string;
}

/**
 * Date editor props
 */
export interface IDateEditorProps extends IBaseEditorProps<string | null> {
  value: string | null;
  format?: string;
  showTime?: boolean;
  timeFormat?: string;
  onChange: (value: string | null) => void;
}

/**
 * Select option
 */
export interface ISelectOption {
  id: string;
  name: string;
  color?: string;
  [key: string]: unknown;
}

/**
 * Select editor props
 */
export interface ISelectEditorProps extends IBaseEditorProps<string | string[] | null> {
  value: string | string[] | null;
  options: ISelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  creatable?: boolean;
  onChange: (value: string | string[] | null) => void;
  onCreateOption?: (name: string) => Promise<ISelectOption>;
}

/**
 * Number editor props
 */
export interface INumberEditorProps extends IBaseEditorProps<number | null> {
  value: number | null;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  format?: 'decimal' | 'percent' | 'currency';
  currencySymbol?: string;
  thousandsSeparator?: boolean;
  onChange: (value: number | null) => void;
}

/**
 * Link editor props
 */
export interface ILinkEditorProps extends IBaseEditorProps<string | null> {
  value: string | null;
  onChange: (value: string | null) => void;
  validateUrl?: boolean;
  openInNewTab?: boolean;
}

/**
 * Attachment file
 */
export interface IAttachmentFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Attachment editor props
 */
export interface IAttachmentEditorProps extends IBaseEditorProps<any> {
  value: IAttachmentFile[] | null;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  onChange: (value: IAttachmentFile[] | null) => void;
  onUpload?: (files: File[]) => Promise<IAttachmentFile[]>;
}

/**
 * User info
 */
export interface IUserInfo {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
}

/**
 * User editor props
 */
export interface IUserEditorProps extends IBaseEditorProps<any> {
  value: string | string[] | null;
  users: IUserInfo[];
  multiple?: boolean;
  searchable?: boolean;
  onChange: (value: string | string[] | null) => void;
}

/**
 * File previewer props
 */
export interface IFilePreviewerProps {
  file: IAttachmentFile;
  onClose?: () => void;
  onDelete?: (fileId: string) => void;
  onDownload?: (file: IAttachmentFile) => void;
}

