import { useCallback, useMemo, useState, useEffect } from 'react';
import { useGridCollapsedGroupStore } from '../../store';

/**
 * Query parameters
 */
export interface IQueryParams {
  groupBy?: string[];
  collapsedGroupIds?: string[];
  [key: string]: unknown;
}

/**
 * Hook for managing collapsed groups
 */
export const useGridCollapsedGroup = (
  cacheKey: string,
  groupFields?: string[],
  initialQuery?: IQueryParams,
  searchValue?: string
) => {
  const { collapsedGroupMap, setCollapsedGroupMap } = useGridCollapsedGroupStore();

  // Get collapsed group IDs from store
  const collapsedGroupIds = useMemo(() => {
    const collapsedGroups = collapsedGroupMap?.[cacheKey];
    return collapsedGroups?.length ? new Set(collapsedGroups) : new Set<string>();
  }, [cacheKey, collapsedGroupMap]);

  // Handle collapsed group changes
  const onCollapsedGroupChanged = useCallback(
    (groupIds: Set<string>) => {
      setCollapsedGroupMap(cacheKey, [...groupIds]);
    },
    [cacheKey, setCollapsedGroupMap]
  );

  // Toggle group collapse state
  const toggleGroupCollapse = useCallback(
    (groupId: string) => {
      const currentCollapsed = collapsedGroupIds || new Set<string>();
      const newCollapsed = new Set(currentCollapsed);

      if (newCollapsed.has(groupId)) {
        newCollapsed.delete(groupId);
      } else {
        newCollapsed.add(groupId);
      }

      onCollapsedGroupChanged(newCollapsed);
    },
    [collapsedGroupIds, onCollapsedGroupChanged]
  );

  // Expand all groups
  const expandAllGroups = useCallback(() => {
    onCollapsedGroupChanged(new Set());
  }, [onCollapsedGroupChanged]);

  // Collapse all groups
  const collapseAllGroups = useCallback(
    (allGroupIds: string[]) => {
      onCollapsedGroupChanged(new Set(allGroupIds));
    },
    [onCollapsedGroupChanged]
  );

  // Check if a group is collapsed
  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      return collapsedGroupIds?.has(groupId) || false;
    },
    [collapsedGroupIds]
  );

  // Build query with collapsed groups
  const viewQuery = useMemo((): IQueryParams => {
    // When searching, expand all groups
    if (searchValue) {
      return groupFields?.length
        ? {
            ...initialQuery,
            groupBy: groupFields,
          }
        : initialQuery || {};
    }

    // Otherwise, include collapsed group IDs
    return groupFields?.length
      ? {
          ...initialQuery,
          groupBy: groupFields,
          collapsedGroupIds: collapsedGroupIds ? Array.from(collapsedGroupIds) : undefined,
        }
      : initialQuery || {};
  }, [searchValue, groupFields, collapsedGroupIds, initialQuery]);

  return {
    viewQuery,
    collapsedGroupIds,
    onCollapsedGroupChanged,
    toggleGroupCollapse,
    expandAllGroups,
    collapseAllGroups,
    isGroupCollapsed,
    hasCollapsedGroups: (collapsedGroupIds?.size || 0) > 0,
  };
};

