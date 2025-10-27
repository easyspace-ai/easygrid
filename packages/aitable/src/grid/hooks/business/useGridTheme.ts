import { useState, useCallback, useMemo, useEffect } from 'react';

/**
 * Grid theme configuration
 */
export interface GridTheme {
  // Colors
  primaryColor: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  headerBackground: string;
  headerText: string;
  selectedBackground: string;
  selectedBorder: string;
  hoverBackground: string;
  
  // Sizes
  rowHeight: number;
  columnWidth: number;
  headerHeight: number;
  fontSize: number;
  
  // Spacing
  cellPadding: number;
  borderWidth: number;
  
  // Effects
  borderRadius: number;
  boxShadow: string;
}

/**
 * Default light theme
 */
export const LIGHT_THEME: GridTheme = {
  primaryColor: '#3b82f6',
  backgroundColor: '#ffffff',
  borderColor: '#e5e7eb',
  textColor: '#1f2937',
  headerBackground: '#f9fafb',
  headerText: '#374151',
  selectedBackground: '#dbeafe',
  selectedBorder: '#3b82f6',
  hoverBackground: '#f3f4f6',
  
  rowHeight: 32,
  columnWidth: 150,
  headerHeight: 36,
  fontSize: 14,
  
  cellPadding: 8,
  borderWidth: 1,
  
  borderRadius: 4,
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
};

/**
 * Default dark theme
 */
export const DARK_THEME: GridTheme = {
  primaryColor: '#60a5fa',
  backgroundColor: '#1f2937',
  borderColor: '#374151',
  textColor: '#f9fafb',
  headerBackground: '#111827',
  headerText: '#e5e7eb',
  selectedBackground: '#1e3a8a',
  selectedBorder: '#60a5fa',
  hoverBackground: '#374151',
  
  rowHeight: 32,
  columnWidth: 150,
  headerHeight: 36,
  fontSize: 14,
  
  cellPadding: 8,
  borderWidth: 1,
  
  borderRadius: 4,
  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.3)',
};

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark' | 'custom';

/**
 * Theme storage key
 */
const THEME_STORAGE_KEY = 'grid-theme-mode';

/**
 * Hook for managing grid theme
 */
export const useGridTheme = (initialMode: ThemeMode = 'light', customTheme?: Partial<GridTheme>) => {
  // Load saved theme mode from localStorage
  const getSavedThemeMode = useCallback((): ThemeMode => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      return (saved as ThemeMode) || initialMode;
    } catch {
      return initialMode;
    }
  }, [initialMode]);

  const [themeMode, setThemeModeState] = useState<ThemeMode>(getSavedThemeMode);

  // Get current theme based on mode
  const theme = useMemo((): GridTheme => {
    const baseTheme = themeMode === 'dark' ? DARK_THEME : LIGHT_THEME;
    
    if (themeMode === 'custom' && customTheme) {
      return { ...baseTheme, ...customTheme };
    }
    
    return baseTheme;
  }, [themeMode, customTheme]);

  // Set theme mode and persist to localStorage
  const setThemeMode = useCallback((mode: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.error('Failed to save theme mode:', error);
    }
    setThemeModeState(mode);
  }, []);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  }, [themeMode, setThemeMode]);

  // Generate CSS variables from theme
  const cssVariables = useMemo(() => ({
    '--grid-primary-color': theme.primaryColor,
    '--grid-bg-color': theme.backgroundColor,
    '--grid-border-color': theme.borderColor,
    '--grid-text-color': theme.textColor,
    '--grid-header-bg': theme.headerBackground,
    '--grid-header-text': theme.headerText,
    '--grid-selected-bg': theme.selectedBackground,
    '--grid-selected-border': theme.selectedBorder,
    '--grid-hover-bg': theme.hoverBackground,
    '--grid-row-height': `${theme.rowHeight}px`,
    '--grid-column-width': `${theme.columnWidth}px`,
    '--grid-header-height': `${theme.headerHeight}px`,
    '--grid-font-size': `${theme.fontSize}px`,
    '--grid-cell-padding': `${theme.cellPadding}px`,
    '--grid-border-width': `${theme.borderWidth}px`,
    '--grid-border-radius': `${theme.borderRadius}px`,
    '--grid-box-shadow': theme.boxShadow,
  }), [theme]);

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, String(value));
    });
  }, [cssVariables]);

  return {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    cssVariables,
    isLightMode: themeMode === 'light',
    isDarkMode: themeMode === 'dark',
    isCustomMode: themeMode === 'custom',
  };
};

