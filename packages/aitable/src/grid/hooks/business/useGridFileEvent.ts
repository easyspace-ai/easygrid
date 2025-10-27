import { useCallback, useEffect, useRef } from 'react';
import type { ICellItem } from '../../interface';
import { SelectionRegionType } from '../../interface';
import { CombinedSelection, emptySelection } from '../../managers';

/**
 * Grid ref interface
 */
export interface IGridRef {
  getContainer: () => HTMLDivElement | null;
  getCellIndicesAtPosition: (x: number, y: number) => ICellItem | null;
  setSelection: (selection: CombinedSelection) => void;
}

/**
 * File event props
 */
interface IUseGridFileEventProps {
  gridRef: React.RefObject<IGridRef>;
  onValidation: (cell: ICellItem) => boolean;
  onCellDrop: (cell: ICellItem, files: FileList) => Promise<void> | void;
}

/**
 * Hook for handling file drag and drop events on grid
 */
export const useGridFileEvent = (props: IUseGridFileEventProps) => {
  const { gridRef, onValidation, onCellDrop } = props;
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dropTargetRef = useRef<ICellItem | null>(null);

  // Get grid stage element
  useEffect(() => {
    if (gridRef.current) {
      const container = gridRef.current.getContainer();
      stageRef.current = container?.querySelector('[data-t-grid-stage]') || null;
    }
  }, [gridRef]);

  /**
   * Get cell at drop position
   */
  const getDropCell = useCallback(
    (event: DragEvent): ICellItem | null => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return gridRef.current?.getCellIndicesAtPosition(x, y) ?? null;
    },
    [gridRef]
  );

  /**
   * Handle drag leave
   */
  const onDragLeave = useCallback(
    (e: DragEvent) => {
      if (e.target !== stageRef.current) {return;}
      e.preventDefault();
      e.stopPropagation();
      
      // Clear selection when leaving
      gridRef.current?.setSelection(emptySelection);
      dropTargetRef.current = null;
    },
    [gridRef]
  );

  /**
   * Handle drag over
   */
  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (e.target !== stageRef.current) {return;}

      e.preventDefault();
      e.stopPropagation();

      const cell = getDropCell(e);
      
      // Validate if cell accepts file drop
      if (!cell || !onValidation(cell)) {
        dropTargetRef.current = null;
        return;
      }

      dropTargetRef.current = cell;

      // Highlight the drop target cell
      const newSelection = new CombinedSelection(SelectionRegionType.Cells, [cell, cell]);
      gridRef.current?.setSelection(newSelection);
    },
    [gridRef, getDropCell, onValidation]
  );

  /**
   * Handle file drop
   */
  const onDrop = useCallback(
    (e: DragEvent) => {
      if (e.target !== stageRef.current) {return;}
      e.preventDefault();
      e.stopPropagation();

      if (!dropTargetRef.current) {return;}

      const files = e.dataTransfer?.files;

      if (!files?.length) {return;}

      // Process dropped files
      onCellDrop(dropTargetRef.current, files);
      
      // Clear drop target
      dropTargetRef.current = null;
      gridRef.current?.setSelection(emptySelection);
    },
    [onCellDrop, gridRef]
  );

  /**
   * Attach event listeners
   */
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {return;}

    stage.addEventListener('dragover', onDragOver as EventListener);
    stage.addEventListener('dragleave', onDragLeave as EventListener);
    stage.addEventListener('drop', onDrop as EventListener);

    return () => {
      stage.removeEventListener('dragover', onDragOver as EventListener);
      stage.removeEventListener('dragleave', onDragLeave as EventListener);
      stage.removeEventListener('drop', onDrop as EventListener);
    };
  }, [onDragOver, onDragLeave, onDrop]);

  return {
    onDragOver,
    onDragLeave,
    onDrop,
  };
};

/**
 * Check if file type is allowed
 */
export const isAllowedFileType = (file: File, allowedTypes: string[]): boolean => {
  if (allowedTypes.length === 0) {return true;}
  
  return allowedTypes.some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.slice(0, -2);
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });
};

/**
 * Validate file size
 */
export const isValidFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

/**
 * Process file list
 */
export const processFileList = (
  files: FileList,
  options: {
    maxFiles?: number;
    maxSize?: number;
    allowedTypes?: string[];
  } = {}
): { valid: File[]; invalid: File[]; errors: string[] } => {
  const { maxFiles = Infinity, maxSize = Infinity, allowedTypes = [] } = options;
  const valid: File[] = [];
  const invalid: File[] = [];
  const errors: string[] = [];

  Array.from(files).forEach((file) => {
    // Check file count
    if (valid.length >= maxFiles) {
      invalid.push(file);
      errors.push(`Too many files. Maximum ${maxFiles} files allowed.`);
      return;
    }

    // Check file type
    if (allowedTypes.length > 0 && !isAllowedFileType(file, allowedTypes)) {
      invalid.push(file);
      errors.push(`File type not allowed: ${file.type}`);
      return;
    }

    // Check file size
    if (!isValidFileSize(file, maxSize)) {
      invalid.push(file);
      errors.push(`File too large: ${file.name} (max size: ${maxSize / 1024 / 1024}MB)`);
      return;
    }

    valid.push(file);
  });

  return { valid, invalid, errors };
};

