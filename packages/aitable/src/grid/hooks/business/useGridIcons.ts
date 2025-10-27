import { useMemo } from 'react';

/**
 * Icon configuration interface
 */
export interface GridIconConfig {
  [key: string]: unknown;
}

/**
 * Default icon set
 */
export const DEFAULT_GRID_ICONS: GridIconConfig = {
  // Field type icons
  text: '📝',
  number: '🔢',
  select: '📋',
  date: '📅',
  checkbox: '☑️',
  user: '👤',
  attachment: '📎',
  link: '🔗',
  rating: '⭐',
  
  // Action icons
  add: '+',
  delete: '🗑️',
  edit: '✏️',
  search: '🔍',
  filter: '🔽',
  sort: '↕️',
  group: '📊',
  expand: '▼',
  collapse: '▶',
  
  // Row controls
  drag: '☰',
  checkbox_row: '☐',
  checkbox_row_checked: '☑',
};

/**
 * Hook for managing grid icons
 */
export const useGridIcons = (customIcons?: GridIconConfig) => {
  return useMemo(() => {
    const icons = {
      ...DEFAULT_GRID_ICONS,
      ...customIcons,
    };

    return {
      icons,
      getIcon: (iconName: string) => icons[iconName] || iconName,
      setIcon: (iconName: string, icon: GridIconConfig[string]) => {
        icons[iconName] = icon;
      },
    };
  }, [customIcons]);
};

