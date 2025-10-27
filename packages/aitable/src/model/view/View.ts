/**
 * View Model
 * Base class for all view types
 */

import type { IView, ViewType, IFilter, ISort, IGroup, IColumnMeta } from '../../api/types';

export interface IViewConfig {
  id: string;
  name: string;
  type: ViewType;
  tableId: string;
  order: number;
  filter?: IFilter;
  sort?: ISort[];
  group?: IGroup[];
  options?: any;
  columnMeta?: Record<string, IColumnMeta>;
  createdTime?: string;
  lastModifiedTime?: string;
}

export class View {
  public id: string;
  public name: string;
  public type: ViewType;
  public tableId: string;
  public order: number;
  public filter?: IFilter;
  public sort?: ISort[];
  public group?: IGroup[];
  public options?: any;
  public columnMeta?: Record<string, IColumnMeta>;
  public createdTime?: string;
  public lastModifiedTime?: string;

  constructor(config: IViewConfig) {
    this.id = config.id;
    this.name = config.name;
    this.type = config.type;
    this.tableId = config.tableId;
    this.order = config.order;
    this.filter = config.filter;
    this.sort = config.sort;
    this.group = config.group;
    this.options = config.options;
    this.columnMeta = config.columnMeta;
    this.createdTime = config.createdTime;
    this.lastModifiedTime = config.lastModifiedTime;
  }

  /**
   * Update filter
   */
  updateFilter(filter: IFilter | undefined): void {
    this.filter = filter;
    this.lastModifiedTime = new Date().toISOString();
  }

  /**
   * Update sort
   */
  updateSort(sort: ISort[] | undefined): void {
    this.sort = sort;
    this.lastModifiedTime = new Date().toISOString();
  }

  /**
   * Update group
   */
  updateGroup(group: IGroup[] | undefined): void {
    this.group = group;
    this.lastModifiedTime = new Date().toISOString();
  }

  /**
   * Update column metadata
   */
  updateColumnMeta(columnId: string, meta: Partial<IColumnMeta>): void {
    if (!this.columnMeta) {
      this.columnMeta = {};
    }
    this.columnMeta[columnId] = {
      ...this.columnMeta[columnId],
      ...meta,
    };
    this.lastModifiedTime = new Date().toISOString();
  }

  /**
   * Get column metadata
   */
  getColumnMeta(columnId: string): IColumnMeta | undefined {
    return this.columnMeta?.[columnId];
  }

  /**
   * Get view as API format
   */
  toApiFormat(): IView {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      tableId: this.tableId,
      order: this.order,
      filter: this.filter,
      sort: this.sort,
      group: this.group,
      options: this.options,
      columnMeta: this.columnMeta,
      createdTime: this.createdTime || '',
      lastModifiedTime: this.lastModifiedTime || '',
    };
  }

  /**
   * Clone this view
   */
  clone(): View {
    return new View({
      ...this.toApiFormat(),
    });
  }
}

export type IViewInstance = View;

/**
 * Create a view instance from API data
 */
export function createViewInstance(view: IView): IViewInstance {
  return new View({
    id: view.id,
    name: view.name,
    type: view.type,
    tableId: view.tableId,
    order: view.order,
    filter: view.filter,
    sort: view.sort,
    group: view.group,
    options: view.options,
    columnMeta: view.columnMeta,
    createdTime: view.createdTime,
    lastModifiedTime: view.lastModifiedTime,
  });
}

/**
 * Create multiple view instances
 */
export function createViewInstances(views: IView[]): IViewInstance[] {
  return views.map(createViewInstance);
}


