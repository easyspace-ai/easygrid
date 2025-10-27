import { useMemo, useCallback } from 'react';
import { getGroupDisplayValue, sortGroupValues } from '../../utils/business/groupValue';

/**
 * Group point interface
 */
export interface IGroupPoint {
  id: string;
  type: 'header' | 'data';
  depth: number;
  value: unknown;
  displayValue: string;
  count: number;
  isCollapsed?: boolean;
}

/**
 * Group field configuration
 */
export interface IGroupField {
  fieldId: string;
  fieldName: string;
  fieldType?: string;
  order?: 'asc' | 'desc';
}

/**
 * Record with group info
 */
export interface IRecordWithGroup {
  id: string;
  groupValue?: unknown;
  [key: string]: unknown;
}

/**
 * Hook for managing group collection
 */
export const useGridGroupCollection = (
  records: IRecordWithGroup[],
  groupFields: IGroupField[],
  collapsedGroups?: Set<string>
) => {
  /**
   * Build group tree structure
   */
  const groupCollection = useMemo(() => {
    if (!groupFields || groupFields.length === 0) {
      return null;
    }

    const groupMap = new Map<string, IGroupPoint>();
    const rootGroups = new Map<unknown, Set<string>>();

    // Group records by field value
    records.forEach((record) => {
      const groupValue = record.groupValue;
      const groupKey = JSON.stringify(groupValue);

      if (!rootGroups.has(groupKey)) {
        rootGroups.set(groupKey, new Set());
      }
      rootGroups.get(groupKey)!.add(record.id);
    });

    // Create group points
    const groups: IGroupPoint[] = [];
    rootGroups.forEach((recordIds, groupValue) => {
      const groupId = JSON.stringify(groupValue);
      const displayValue = getGroupDisplayValue(groupValue, groupFields[0]?.fieldType);
      
      const groupPoint: IGroupPoint = {
        id: groupId,
        type: 'header',
        depth: 0,
        value: groupValue,
        displayValue,
        count: recordIds.size,
        isCollapsed: collapsedGroups?.has(groupId),
      };

      groups.push(groupPoint);
      groupMap.set(groupId, groupPoint);
    });

    // Sort groups
    groups.sort((a, b) => {
      const order = groupFields[0]?.order || 'asc';
      const result = sortGroupValues(a.value, b.value);
      return order === 'desc' ? -result : result;
    });

    return {
      groups,
      groupMap,
      totalGroups: groups.length,
    };
  }, [records, groupFields, collapsedGroups]);

  /**
   * Get records for a specific group
   */
  const getGroupRecords = useCallback(
    (groupId: string): IRecordWithGroup[] => {
      if (!groupCollection) {return [];}

      const groupPoint = groupCollection.groupMap.get(groupId);
      if (!groupPoint) {return [];}

      return records.filter((record) => {
        const recordGroupId = JSON.stringify(record.groupValue);
        return recordGroupId === groupId;
      });
    },
    [records, groupCollection]
  );

  /**
   * Get group by ID
   */
  const getGroup = useCallback(
    (groupId: string): IGroupPoint | undefined => {
      return groupCollection?.groupMap.get(groupId);
    },
    [groupCollection]
  );

  /**
   * Check if a group is collapsed
   */
  const isGroupCollapsed = useCallback(
    (groupId: string): boolean => {
      const group = getGroup(groupId);
      return group?.isCollapsed || false;
    },
    [getGroup]
  );

  /**
   * Get visible records (excluding records in collapsed groups)
   */
  const visibleRecords = useMemo(() => {
    if (!groupCollection || !collapsedGroups || collapsedGroups.size === 0) {
      return records;
    }

    return records.filter((record) => {
      const recordGroupId = JSON.stringify(record.groupValue);
      return !collapsedGroups.has(recordGroupId);
    });
  }, [records, groupCollection, collapsedGroups]);

  return {
    groupCollection,
    getGroupRecords,
    getGroup,
    isGroupCollapsed,
    visibleRecords,
    hasGroups: !!groupCollection && groupCollection.totalGroups > 0,
  };
};

