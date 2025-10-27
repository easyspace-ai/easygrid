// Avoid const enum under isolatedModules: re-declare minimal used codes
export const Key = {
  Shift: 'Shift',
} as const;

export const KeyCode = {
  Space: 32,
  A: 65,
  Z: 90,
  ClosedParen: 48,
  OpenParen: 57,
  Numpad0: 96,
  Numpad9: 105,
  SemiColon: 186,
  Tilde: 192,
  OpenBracket: 219,
  Quote: 222,
  Multiply: 106,
  Divide: 111,
} as const;

export const isPrintableKey = (event: KeyboardEvent) => {
  const { keyCode } = event;
  const { metaKey, ctrlKey } = event;

  if (metaKey || ctrlKey || keyCode === KeyCode.Space) {return false;}
  return (
    (keyCode >= KeyCode.A && keyCode <= KeyCode.Z) ||
    (keyCode >= KeyCode.ClosedParen && keyCode <= KeyCode.OpenParen) ||
    (keyCode >= KeyCode.Numpad0 && keyCode <= KeyCode.Numpad9) ||
    (keyCode >= KeyCode.SemiColon && keyCode <= KeyCode.Tilde) ||
    (keyCode >= KeyCode.OpenBracket && keyCode <= KeyCode.Quote) ||
    (keyCode >= KeyCode.Multiply && keyCode <= KeyCode.Divide) ||
    keyCode === KeyCode.Space ||
    keyCode === 61 ||
    keyCode === 173 ||
    ((keyCode === 229 || keyCode === 0) && event.key !== Key.Shift)
  );
};

export const isNumberKey = (keyCode: number) => {
  return (
    (keyCode >= KeyCode.ClosedParen && keyCode <= KeyCode.OpenParen) ||
    (keyCode >= KeyCode.Numpad0 && keyCode <= KeyCode.Numpad9)
  );
};

/**
 * 检查是否是撤销快捷键 (Ctrl+Z / Cmd+Z)
 */
export const isUndoKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'z' && !event.shiftKey;
};

/**
 * 检查是否是重做快捷键 (Ctrl+Shift+Z / Cmd+Shift+Z)
 */
export const isRedoKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'z' && event.shiftKey;
};

/**
 * 检查是否是复制快捷键 (Ctrl+C / Cmd+C)
 */
export const isCopyKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'c';
};

/**
 * 检查是否是粘贴快捷键 (Ctrl+V / Cmd+V)
 */
export const isPasteKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'v';
};

/**
 * 检查是否是剪切快捷键 (Ctrl+X / Cmd+X)
 */
export const isCutKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'x';
};

/**
 * 检查是否是全选快捷键 (Ctrl+A / Cmd+A)
 */
export const isSelectAllKey = (event: KeyboardEvent) => {
  const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const isCtrlOrCmd = isMac ? event.metaKey : event.ctrlKey;
  return isCtrlOrCmd && event.key === 'a';
};
